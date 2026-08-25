const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://idealy.app",
  "https://idealy-ai.netlify.app",
];

function headersFor(request?: Request): Record<string, string> {
  const configured = [Deno.env.get("IDEALY_ALLOWED_ORIGINS") ?? "", Deno.env.get("APP_ORIGIN") ?? ""]
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const allowed = configured.length ? [...new Set(configured)] : DEFAULT_ALLOWED_ORIGINS;
  const requested = request?.headers.get("Origin")?.replace(/\/$/, "");
  return {
    "Access-Control-Allow-Origin": requested && allowed.includes(requested) ? requested : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function corsResponse(body: unknown, status = 200, request?: Request) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headersFor(request) } });
}

export function optionsResponse(request?: Request) {
  return new Response(null, { status: 204, headers: headersFor(request) });
}
