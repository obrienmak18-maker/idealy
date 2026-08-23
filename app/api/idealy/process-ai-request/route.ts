import { getIdealyAiFunctionUrl } from "@/lib/idealy/config";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(getIdealyAiFunctionUrl(), {
      body: await request.text(),
      headers: {
        Authorization: authorization,
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        ...(request.headers.get("apikey")
          ? { apikey: request.headers.get("apikey") as string }
          : {}),
      },
      method: "POST",
    });

    return new Response(response.body, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
      status: response.status,
    });
  } catch (error) {
    console.error("Idealy AI proxy failed", error);
    return Response.json(
      { error: "Le backend Idealy est momentanément indisponible." },
      { status: 502 }
    );
  }
}
