import { NextResponse } from "next/server";
import { searchPexelsImages } from "@/lib/idealy/connectors/pexels";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Le paramètre 'query' est requis." },
      { status: 400 }
    );
  }

  const perPage = Number(searchParams.get("perPage") || "6");
  const orientation = searchParams.get("orientation") as
    | "landscape"
    | "portrait"
    | "square"
    | undefined;

  const result = await searchPexelsImages({
    query,
    perPage: Number.isFinite(perPage) ? perPage : 6,
    orientation: ["landscape", "portrait", "square"].includes(orientation || "")
      ? orientation
      : undefined,
  });

  return NextResponse.json(result, {
    status: result.configured ? 200 : 503,
  });
}
