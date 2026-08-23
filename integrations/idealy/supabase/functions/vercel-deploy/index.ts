import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse(request);
  }
  if (request.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405, request);
  }

  const auth = await authenticate(request);
  if ("error" in auth) {
    return corsResponse({ error: auth.error }, auth.status, request);
  }

  const token = Deno.env.get("VERCEL_TOKEN");
  if (!token) {
    return corsResponse(
      { error: "Vercel server connector is not configured." },
      503,
      request
    );
  }

  try {
    const body = await request.json();
    const schema = body?.schema;
    if (
      !schema?.project?.name ||
      !schema?.project?.files ||
      typeof schema.project.files !== "object"
    ) {
      return corsResponse({ error: "Invalid IUPS schema." }, 400, request);
    }

    const files = Object.entries(
      schema.project.files as Record<string, unknown>
    );
    let totalBytes = 0;
    const vercelFiles = [];
    for (const [filePath, rawContent] of files) {
      if (
        typeof rawContent !== "string" ||
        filePath.length > 240 ||
        filePath.startsWith("/") ||
        filePath.includes("..")
      ) {
        return corsResponse(
          { error: `Invalid file: ${filePath}` },
          400,
          request
        );
      }
      const bytes = new TextEncoder().encode(rawContent).byteLength;
      if (bytes > MAX_FILE_BYTES) {
        return corsResponse(
          { error: `File too large: ${filePath}` },
          413,
          request
        );
      }
      totalBytes += bytes;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return corsResponse(
          { error: "Project payload too large." },
          413,
          request
        );
      }
      vercelFiles.push({
        data: encodeBase64(rawContent),
        encoding: "base64",
        file: filePath,
      });
    }

    const response = await fetch("https://api.vercel.com/v13/deployments", {
      body: JSON.stringify({
        files: vercelFiles,
        meta: { idealy_user_id: auth.user.id },
        name: slugify(String(schema.project.name)),
        projectSettings: {
          buildCommand: "npm run build",
          framework: "vite",
          installCommand: "npm install",
          outputDirectory: "dist",
        },
        target: body?.target === "preview" ? "preview" : "production",
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return corsResponse(
        {
          error: data?.error?.message ?? `Vercel API error ${response.status}`,
        },
        response.status >= 500 ? 502 : response.status,
        request
      );
    }

    return corsResponse(
      {
        createdAt: data.createdAt ?? Date.now(),
        id: data.id,
        readyState: data.readyState ?? "BUILDING",
        url: data.url ? `https://${data.url}` : "",
      },
      200,
      request
    );
  } catch (error) {
    console.error("vercel-deploy failed", error);
    return corsResponse({ error: "Deployment request failed." }, 500, request);
  }
});
