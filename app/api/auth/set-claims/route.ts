/**
 * POST /api/auth/set-claims
 *
 * Sets role:"authenticated" custom claim on a Firebase user.
 * Called immediately after registration or first sign-in so that
 * the Firebase JWT is accepted by Supabase Third-Party Auth with
 * the postgres "authenticated" role.
 *
 * Body: { idToken: string }
 * Returns: { ok: true } | { error: string }
 *
 * Security: the idToken is verified server-side before setting claims.
 * This endpoint NEVER accepts a bare UID from the client.
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  isFirebaseAdminConfigured,
  setAuthenticatedClaim,
  verifyFirebaseToken,
} from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).idToken !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required field: idToken" },
      { status: 400 }
    );
  }

  const { idToken } = body as { idToken: string };

  // Verify the token is genuine before doing anything
  const decoded = await verifyFirebaseToken(idToken);
  if (!decoded) {
    return NextResponse.json(
      { error: "Invalid or expired Firebase ID token" },
      { status: 401 }
    );
  }

  await setAuthenticatedClaim(decoded.uid);

  return NextResponse.json({ ok: true, uid: decoded.uid });
}
