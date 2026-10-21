import { type NextRequest, NextResponse } from "next/server";

import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).token !== "string"
  ) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await verifyTurnstileToken(
    String((body as Record<string, unknown>).token),
    ip
  );

  if (!result.ok) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, enabled: result.enabled });
}
