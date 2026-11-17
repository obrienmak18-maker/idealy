import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Derives a cryptographically strict 32-byte (256-bit) AES key.
 * Prioritizes dedicated INTEGRATION_ENCRYPTION_KEY or AI_KEY_ENCRYPTION_SECRET,
 * falling back to server authentication secrets (AUTH_SECRET, SUPABASE_SERVICE_ROLE_KEY).
 */
function getDerivedKey(): Buffer {
  const candidate =
    process.env.INTEGRATION_ENCRYPTION_KEY?.trim() ||
    process.env.AI_KEY_ENCRYPTION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "idealy-secure-connector-encryption-default-dev-seed";

  // If candidate is already a 32-byte base64-encoded string, use its decoded bytes
  try {
    const raw = Buffer.from(candidate, "base64");
    if (raw.length === 32) {
      return raw;
    }
  } catch {
    // ignore
  }

  // Otherwise, deterministically hash with SHA-256 to produce exactly 32 bytes
  return createHash("sha256").update(candidate).digest();
}

/**
 * Encrypts a connector access token or API key using AES-256-GCM.
 * The 16-byte authentication tag is appended to the ciphertext to ensure integrity.
 */
export function encryptConnectorToken(plaintext: string): {
  algorithm: string;
  ciphertext: string;
  iv: string;
} {
  const key = getDerivedKey();
  const iv = randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 16 bytes auth tag

  // Pack ciphertext + tag together (compatible with Supabase Edge Functions)
  const packed = Buffer.concat([encrypted, tag]);

  return {
    algorithm: "AES-GCM-256",
    ciphertext: packed.toString("base64"),
    iv: iv.toString("base64"),
  };
}

/**
 * Decrypts a connector token encrypted with encryptConnectorToken.
 */
export function decryptConnectorToken(
  ciphertextBase64: string,
  ivBase64: string,
): string {
  const key = getDerivedKey();
  const iv = Buffer.from(ivBase64, "base64");
  const packed = Buffer.from(ciphertextBase64, "base64");

  if (packed.length < 16) {
    throw new Error("Ciphertext too short to contain authentication tag.");
  }

  const ciphertext = packed.subarray(0, packed.length - 16);
  const tag = packed.subarray(packed.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
