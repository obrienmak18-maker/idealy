import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticate } from '../_shared/auth.ts';
import { corsResponse, optionsResponse } from '../_shared/cors.ts';
import { decryptIntegrationToken } from '../_shared/integrationCrypto.ts';

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function exportPayloadDigest(projectName: string, files: Record<string, string>) {
  const manifest = await Promise.all(
    Object.entries(files)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(async ([path, content]) => ({ path, checksum: await sha256(content) })),
  );
  return sha256(JSON.stringify({ projectName: projectName.trim(), files: manifest }));
}

async function githubFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'message' in data
      ? String(data.message)
      : `GitHub error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request);
  if (request.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405, request);

  const auth = await authenticate(request);
  if ('error' in auth) return corsResponse({ error: auth.error }, auth.status, request);

  try {
    const { confirmationToken, files, missionId, projectName } = await request.json();
    if (
      typeof confirmationToken !== "string" ||
      confirmationToken.length < 32 ||
      !UUID_PATTERN.test(missionId ?? "") ||
      typeof projectName !== 'string' ||
      projectName.trim().length === 0 ||
      projectName.length > 100 ||
      !files ||
      typeof files !== 'object' ||
      Array.isArray(files)
    ) {
      return corsResponse({ error: 'Invalid project payload.' }, 400, request);
    }

    let totalBytes = 0;
    for (const [path, content] of Object.entries(files as Record<string, unknown>)) {
      if (!path || path.includes('..') || path.startsWith('/') || typeof content !== 'string') {
        return corsResponse({ error: `Invalid file path or content: ${path}` }, 400, request);
      }
      const size = new TextEncoder().encode(content).byteLength;
      if (size > MAX_FILE_BYTES) return corsResponse({ error: `File too large: ${path}` }, 413, request);
      totalBytes += size;
      if (totalBytes > MAX_TOTAL_BYTES) return corsResponse({ error: 'Project payload too large.' }, 413, request);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: integration, error: integrationError } = await admin
      .from('user_integrations')
      .select('id, status')
      .eq('user_id', auth.user.id)
      .eq('provider', 'github')
      .maybeSingle();

    if (integrationError || !integration || integration.status !== 'active') {
      return corsResponse({ error: 'GitHub not connected. Please connect GitHub in Connectors.' }, 400, request);
    }

    const { data: mission, error: missionError } = await admin
      .from("missions")
      .select("id")
      .eq("id", missionId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (missionError || !mission) return corsResponse({ error: "Mission not found." }, 404, request);

    const payloadDigest = await exportPayloadDigest(projectName, files as Record<string, string>);
    const confirmationTokenHash = await sha256(confirmationToken);
    const { data: confirmation, error: confirmationError } = await admin
      .from("mission_action_confirmations")
      .update({ consumed_at: new Date().toISOString(), status: "consumed" })
      .eq("mission_id", missionId)
      .eq("user_id", auth.user.id)
      .eq("integration_id", integration.id)
      .eq("operation", "github:export")
      .eq("confirmation_token_hash", confirmationTokenHash)
      .eq("status", "approved")
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id,resource_snapshot")
      .maybeSingle();
    if (confirmationError || !confirmation) {
      return corsResponse({ error: "A valid one-time export confirmation is required." }, 409, request);
    }
    const snapshot = confirmation.resource_snapshot as { payload_digest?: unknown } | null;
    if (!snapshot || snapshot.payload_digest !== payloadDigest) {
      return corsResponse({ error: "The confirmation does not match this export payload." }, 409, request);
    }

    const { data: credential, error: credentialError } = await admin
      .from('integration_credentials')
      .select('ciphertext, iv')
      .eq('integration_id', integration.id)
      .maybeSingle();
    if (credentialError || !credential?.ciphertext || !credential.iv) {
      return corsResponse({ error: 'GitHub credentials are unavailable. Please reconnect GitHub.' }, 400, request);
    }

    const token = await decryptIntegrationToken(credential.ciphertext, credential.iv);
    const repoName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `idealy-${crypto.randomUUID().slice(0, 8)}`;

    const repo = await githubFetch('https://api.github.com/user/repos', token, {
      method: 'POST',
      body: JSON.stringify({
        name: repoName,
        description: 'Generated by Idealy — https://idealy.app',
        private: true,
        auto_init: true,
      }),
    });

    const owner = repo.owner.login;
    const repoFullName = repo.full_name;
    const branchData = await githubFetch(
      `https://api.github.com/repos/${repoFullName}/git/ref/heads/${repo.default_branch}`,
      token,
    );
    const baseTreeSHA = branchData.object.sha;
    const commitData = await githubFetch(
      `https://api.github.com/repos/${repoFullName}/git/commits/${baseTreeSHA}`,
      token,
    );
    const baseTree = commitData.tree.sha;

    const treeItems = await Promise.all(
      Object.entries(files as Record<string, string>).map(async ([path, content]) => {
        const blob = await githubFetch(
          `https://api.github.com/repos/${repoFullName}/git/blobs`,
          token,
          {
            method: 'POST',
            body: JSON.stringify({
              content: btoa(unescape(encodeURIComponent(content))),
              encoding: 'base64',
            }),
          },
        );
        return { path, mode: '100644', type: 'blob', sha: blob.sha };
      }),
    );

    const newTree = await githubFetch(
      `https://api.github.com/repos/${repoFullName}/git/trees`,
      token,
      { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree: treeItems }) },
    );
    const newCommit = await githubFetch(
      `https://api.github.com/repos/${repoFullName}/git/commits`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          message: 'Initial commit — Generated by Idealy',
          tree: newTree.sha,
          parents: [baseTreeSHA],
        }),
      },
    );
    await githubFetch(
      `https://api.github.com/repos/${repoFullName}/git/refs/heads/${repo.default_branch}`,
      token,
      { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) },
    );

    return corsResponse({ repoUrl: repo.html_url, owner, repo: repoName }, 200, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected export error.';
    console.error('github-export failed', message);
    return corsResponse({ error: message }, 500, request);
  }
});
