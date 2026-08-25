import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST")
    return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth)
    return corsResponse({ error: auth.error }, auth.status, request);

  return corsResponse(
    {
      error:
        "Vercel deployment is unavailable until a user-scoped OAuth integration and one-time deployment confirmation are configured.",
    },
    503,
    request,
  );
});
