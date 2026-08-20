import { getIdealyApiUrl } from "@/lib/idealy/config";

export async function GET() {
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
