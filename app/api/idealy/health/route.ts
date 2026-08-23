import { getIdealyApiUrl } from "@/lib/idealy/config";

export async function GET() {
  if (process.env.DEMO_MODE === "true") {
    return Response.json({
      configuredUrl: null,
      mode: "demo",
      service: "idealy-api",
      status: "ready",
      upstream: null,
    });
  }

  const url = `${getIdealyApiUrl()}/api/healthz`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json().catch(() => null);

    return Response.json(
      {
        configuredUrl: getIdealyApiUrl(),
        service: "idealy-api",
        upstream: payload,
        upstreamStatus: response.status,
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch {
    return Response.json(
      {
        configuredUrl: getIdealyApiUrl(),
        error: "Backend Idealy indisponible ou non démarré.",
        service: "idealy-api",
      },
      { status: 503 }
    );
  }
}
