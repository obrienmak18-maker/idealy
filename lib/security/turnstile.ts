import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const PROOF_MAX_AGE_MS = 120_000;

export function isTurnstileRequired(): boolean {
  return (
    process.env.AUTH_REQUIRE_TURNSTILE?.trim().toLowerCase() === "true" ||
    Boolean(
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ||
        process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim()
    )
  );
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null
): Promise<{ ok: boolean; enabled: boolean }> {
  if (!isTurnstileRequired()) {
    return { ok: true, enabled: false };
  }

  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim();
  const responseToken = token.trim();

  if (!siteKey || !secret || !responseToken) {
    return { ok: false, enabled: true };
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        secret,
        response: responseToken,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });

    if (!response.ok) {
      return { ok: false, enabled: true };
    }

    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
    };

    if (result.success !== true) {
      return { ok: false, enabled: true };
    }

    const allowedHostnames = (process.env.CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean);

    if (
      allowedHostnames.length > 0 &&
      (!result.hostname ||
        !allowedHostnames.includes(result.hostname.trim().toLowerCase()))
    ) {
      return { ok: false, enabled: true };
    }

    return { ok: true, enabled: true };
  } catch {
    return { ok: false, enabled: true };
  }
}

/** A short-lived proof lets a verified server action continue through Auth.js
 * without validating Cloudflare's single-use token a second time. */
export function createTurnstileProof(purpose: string): string | null {
  if (!isTurnstileRequired()) {
    return null;
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const issuedAt = String(Date.now());
  const nonce = randomBytes(18).toString("base64url");
  const payload = [issuedAt, purpose, nonce].join(".");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyTurnstileProof(proof: string, purpose: string): boolean {
  if (!isTurnstileRequired()) {
    return true;
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || !proof) {
    return false;
  }

  const parts = proof.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const [issuedAt, providedPurpose, nonce, providedSignature] = parts;
  const timestamp = Number(issuedAt);
  const age = Date.now() - timestamp;

  if (
    !Number.isSafeInteger(timestamp) ||
    age < -10_000 ||
    age > PROOF_MAX_AGE_MS ||
    providedPurpose !== purpose ||
    !nonce ||
    !providedSignature
  ) {
    return false;
  }

  const payload = [issuedAt, providedPurpose, nonce].join(".");
  const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(providedSignature);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
