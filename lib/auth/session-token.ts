import "server-only";

import type { NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";

/**
 * Robust JWT session extractor.
 * Automatically handles:
 * - HTTPS environments (__Secure-authjs.session-token)
 * - HTTP / localhost development and production builds (authjs.session-token)
 * - Reverse proxies (X-Forwarded-Proto)
 */
export async function getSafeToken(
  request: NextRequest | Request
): Promise<JWT | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  // Determine if the incoming request appears to be secure
  let isHttps = false;
  if ("nextUrl" in request) {
    isHttps = request.nextUrl.protocol === "https:";
  } else if ("url" in request && typeof request.url === "string") {
    isHttps = request.url.startsWith("https://");
  }

  const forwardedProto =
    request.headers instanceof Headers
      ? request.headers.get("x-forwarded-proto")
      : (request.headers as Record<string, string | undefined>)?.[
          "x-forwarded-proto"
        ];
  if (forwardedProto === "https") {
    isHttps = true;
  }

  // 1. First attempt: with the inferred protocol
  try {
    const token = await getToken({
      req: request,
      secret,
      secureCookie: isHttps,
    });
    if (token) return token;
  } catch {
    // Continue to fallback
  }

  // 2. Fallback attempt: opposite secureCookie setting (covers localhost prod builds or mismatched proxies)
  try {
    const fallbackToken = await getToken({
      req: request,
      secret,
      secureCookie: !isHttps,
    });
    if (fallbackToken) return fallbackToken;
  } catch {
    // Both failed
  }

  return null;
}
