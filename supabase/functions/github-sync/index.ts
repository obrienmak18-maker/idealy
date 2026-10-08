import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";
import { decryptIntegrationToken } from "../_shared/integrationCrypto.ts";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_BRANCH = /^[a-zA-Z0-9._/-]{1,120}$/;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function payloadDigest(project: string, branch: string, files: Record<string, string>) {
  const manifest = await Promise.all(
    Object.entries(files)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([path, content]) => ({
        path,
        checksum: await sha256(content),
      })),
  );
  return sha256(JSON.stringify({
    branch,
    files: manifest,
    project,
  }));
}

async function githubFetch(url: string, token: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message)
        : "GitHub request failed.";
    throw new Error(message);
  }
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth) return corsResponse({ error: auth.error }, auth.status, request);

  try {
    const body = await request.json().catch(() => null) as {
      confirmationToken?: unknown;
      files?: unknown;
      missionId?: unknown;
      owner?: unknown;
      repo?: unknown;
      branch?: unknown;
      projectName?: unknown;
    } | null;

    const missionId = typeof body?.missionId === "string" ? body.missionId : "";
    const owner = typeof body?.owner === "string" ? body.owner.trim() : "";
    const repo = typeof body?.repo === "string" ? body.repo.trim() : "";
    const projectName =
      typeof body?.projectName === "string" && body.projectName.trim()
        ? body.projectName.trim()
        : repo;
    const requestedBranch =
      typeof body?.branch === "string" && body.branch.trim()
        ? body.branch.trim()
        : `idealy/mission-${missionId.slice(0, 8)}`;
    const confirmationToken =
      typeof body?.confirmationToken === "string"
        ? body.confirmationToken
        : "";
    const files =
      body?.files && typeof body.files === "object" && !Array.isArray(body.files)
        ? body.files as Record<string, unknown>
        : null;

    if (
      !UUID_PATTERN.test(missionId) ||
      !owner ||
      !repo ||
      !SAFE_BRANCH.test(requestedBranch) ||
      requestedBranch === "main" ||
      requestedBranch === "master" ||
      confirmationToken.length < 32 ||
      !files
    ) {
      return corsResponse({ error: "Invalid GitHub sync payload." }, 400, request);
    }

    let totalBytes = 0;
    const normalizedFiles: Record<string, string> = {};

    for (const [path, value] of Object.entries(files)) {
      if (
        !path ||
        path.startsWith("/") ||
        path.includes("..") ||
        typeof value !== "string"
      ) {
        return corsResponse({ error: `Invalid file path: ${path}` }, 400, request);
      }
      const size = new TextEncoder().encode(value).byteLength;
      if (size > MAX_FILE_BYTES) {
        return corsResponse({ error: `File too large: ${path}` }, 413, request);
      }
      totalBytes += size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return corsResponse({ error: "Project payload too large." }, 413, request);
      }
      normalizedFiles[path] = value;
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: integration, error: integrationError } = await admin
      .from("user_integrations")
      .select("id,status")
      .eq("user_id", auth.user.id)
      .eq("provider", "github")
      .maybeSingle();

    if (integrationError || !integration || integration.status !== "active") {
      return corsResponse(
        { error: "GitHub is not connected for this user." },
        409,
        request,
      );
    }

    const { data: mission, error: missionError } = await admin
      .from("missions")
      .select("id")
      .eq("id", missionId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (missionError || !mission) {
      return corsResponse({ error: "Mission not found." }, 404, request);
    }

    const digest = await payloadDigest(projectName, requestedBranch, normalizedFiles);
    const tokenHash = await sha256(confirmationToken);

    const { data: confirmation, error: confirmationError } = await admin
      .from("mission_action_confirmations")
      .select("id,resource_snapshot")
      .eq("mission_id", missionId)
      .eq("user_id", auth.user.id)
      .eq("integration_id", integration.id)
      .eq("operation", "github:export")
      .eq("confirmation_token_hash", tokenHash)
      .eq("status", "approved")
      .gt("expires_at", new Date().toISOString())
      .is("consumed_at", null)
      .maybeSingle();

    if (
      confirmationError ||
      !confirmation ||
      (confirmation.resource_snapshot as { payload_digest?: unknown } | null)?.payload_digest !== digest
    ) {
      return corsResponse(
        {
          error: "A valid one-time confirmation matching this exact export is required.",
          code: "CONFIRMATION_INVALID",
        },
        409,
        request,
      );
    }

    const { data: credential, error: credentialError } = await admin
      .from("integration_credentials")
      .select("ciphertext,iv")
      .eq("integration_id", integration.id)
      .maybeSingle();

    if (credentialError || !credential?.ciphertext || !credential.iv) {
      return corsResponse({ error: "GitHub credentials are unavailable." }, 409, request);
    }

    const token = await decryptIntegrationToken(
      credential.ciphertext,
      credential.iv,
    );

    const repository = await githubFetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token,
    );

    const defaultBranch = String(repository.default_branch || "main");
    if (requestedBranch === defaultBranch) {
      return corsResponse(
        { error: "Idealy never synchronizes generated work directly to the repository default branch." },
        409,
        request,
      );
    }

    let baseSha: string;
    const requestedRef = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(requestedBranch)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (requestedRef.ok) {
      const refData = await requestedRef.json();
      baseSha = refData.object.sha;
    } else {
      const defaultRef = await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
        token,
      );
      baseSha = defaultRef.object.sha;
      await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${requestedBranch}`,
            sha: baseSha,
          }),
        },
      );
    }

    const commitData = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
      token,
    );

    const treeItems = await Promise.all(
      Object.entries(normalizedFiles).map(async ([path, content]) => {
        const blob = await githubFetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
          token,
          {
            method: "POST",
            body: JSON.stringify({
              content: btoa(unescape(encodeURIComponent(content))),
              encoding: "base64",
            }),
          },
        );
        return {
          mode: "100644",
          path,
          sha: blob.sha,
          type: "blob",
        };
      }),
    );

    const tree = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: commitData.tree.sha,
          tree: treeItems,
        }),
      },
    );

    const commit = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          message: `feat(idealy): sync mission ${missionId.slice(0, 8)}`,
          parents: [baseSha],
          tree: tree.sha,
        }),
      },
    );

    await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(requestedBranch)}`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha }),
      },
    );

    const { error: consumeError } = await admin
      .from("mission_action_confirmations")
      .update({
        consumed_at: new Date().toISOString(),
        status: "consumed",
      })
      .eq("id", confirmation.id)
      .eq("user_id", auth.user.id)
      .eq("status", "approved")
      .is("consumed_at", null);

    if (consumeError) {
      return corsResponse(
        { error: "The GitHub change was written, but confirmation consumption failed. Contact support before retrying." },
        500,
        request,
      );
    }

    return corsResponse(
      {
        branch: requestedBranch,
        repository: repository.full_name,
        repoUrl: repository.html_url,
        branchUrl: `${repository.html_url}/tree/${requestedBranch}`,
        commitSha: commit.sha,
        filesCount: Object.keys(normalizedFiles).length,
        success: true,
      },
      200,
      request,
    );
  } catch (error) {
    console.error("github-sync failed", error);
    return corsResponse(
      {
        error: error instanceof Error ? error.message.slice(0, 400) : "GitHub sync failed.",
        code: "GITHUB_SYNC_FAILED",
      },
      502,
      request,
    );
  }
});
