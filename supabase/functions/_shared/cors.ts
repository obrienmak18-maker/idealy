const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://idealy.app",
  "https://idealy-ai.netlify.app",
];

function configuredOrigins(): string[] {
  const values = [
    Deno.env.get("IDEALY_ALLOWED_ORIGINS") ?? "",
    Deno.env.get("APP_ORIGIN") ?? "",
  ]
    .flatMap((value) => value.split(","))
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set(values.length > 0 ? values : DEFAULT_ALLOWED_ORIGINS)];
}

function headersFor(request?: Request): Record<string, string> {
  const allowed = configuredOrigins();
  const requested = request?.headers.get("Origin")?.replace(/\/$/, "");
  const origin =
    requested && allowed.includes(requested) ? requested : allowed[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handleCors(response: Response, request?: Request): Response {
  Object.entries(headersFor(request)).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
  return response;
}

export function corsResponse(
  body: unknown,
  status = 200,
  request?: Request,
): Response {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return handleCors(response, request);
}

export function optionsResponse(request?: Request): Response {
  return handleCors(new Response(null, { status: 204 }), request);
}
