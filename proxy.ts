import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Local visual demo only: keep the full UI navigable without Auth.js/Postgres.
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth") || pathname === "/api/idealy/health") {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Une session Idealy authentifiée est requise." },
        { status: 401 }
      );
    }

    if (
      [
        "/demo-flow",
        "/login",
        "/register",
        "/welcome",
        "/about",
        "/docs",
        "/privacy",
        "/terms",
      ].includes(pathname) ||
      pathname.startsWith("/images/agents/")
    ) {
      return NextResponse.next();
    }

    const loginUrl = new URL(`${base}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)",
  ],
};
