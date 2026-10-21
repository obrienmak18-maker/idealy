import { type NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/db/queries";
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
    typeof (body as Record<string, unknown>).email !== "string" ||
    typeof (body as Record<string, unknown>).turnstileToken !== "string"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = String((body as Record<string, unknown>).email).trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const challenge = await verifyTurnstileToken(
    String((body as Record<string, unknown>).turnstileToken),
    ip,
    "register"
  );

  if (!challenge.ok) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  try {
    const users = await getUser(email);
    if (users.length > 0) {
      return NextResponse.json({ status: "user_exists" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "auth_service_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ status: "ok" });
}
