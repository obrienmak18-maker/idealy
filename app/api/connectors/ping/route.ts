import { NextResponse } from "next/server";

/**
 * GET /api/connectors/ping
 * Returns the current server timestamp so clients can measure round-trip
 * latency to the API layer. Does NOT expose any connector secrets.
 */
export async function GET() {
  return NextResponse.json({ ts: Date.now(), status: "ok" });
}
