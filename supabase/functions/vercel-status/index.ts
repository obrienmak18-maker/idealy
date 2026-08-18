import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST")
    return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth)
    return corsResponse({ error: auth.error }, auth.status, request);

  const token = Deno.env.get("VERCEL_TOKEN");
  if (!token)
    return corsResponse(
      { error: "Vercel server connector is not configured." },
      503,
      request,
    );

  try {
    const { deploymentId } = await request.json();
    if (
      typeof deploymentId !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(deploymentId)
    )
      return corsResponse({ error: "Invalid deployment id." }, 400, request);

    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      return corsResponse(
        {
          error: data?.error?.message ?? `Vercel API error ${response.status}`,
        },
        response.status >= 500 ? 502 : response.status,
        request,
      );

    const ownerId = data?.meta?.idealy_user_id;
    if (ownerId !== auth.user.id) {
      return corsResponse(
        { error: "Deployment does not belong to the authenticated user." },
        403,
        request,
      );
    }

    return corsResponse(
      {
        id: data.id,
        readyState: data.readyState,
        url: data.url ? `https://${data.url}` : "",
      },
      200,
      request,
    );
  } catch (error) {
    console.error("vercel-status failed", error);
    return corsResponse(
      { error: "Deployment status request failed." },
      500,
      request,
    );
  }
});
