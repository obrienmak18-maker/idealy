import { NextResponse } from "next/server";

export async function GET() {
  const code =
    process.env.BING_SITE_VERIFICATION ||
    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
    "";

  const xml = `<?xml version="1.0"?>\n<users>\n\t<user>${code}</user>\n</users>\n`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
