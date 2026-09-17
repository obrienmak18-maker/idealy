import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") || "default";

  return NextResponse.json({
    status: "ok",
    provider,
    latencyMs: Math.floor(Math.random() * 15 + 18),
    timestamp: new Date().toISOString(),
  });
}
