const secretPatterns: RegExp[] = [
  /\bsk-(?:live|test|proj|ant|svcacct)-[A-Za-z0-9_-]{12,}\b/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{12,}\b/g,
  /\brk_(?:live|test)_[A-Za-z0-9]{12,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\b(?:glpat|npm|hf)_[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}/gi,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]{1,2048}?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
];

export function containsLikelySecret(value: string): boolean {
  return secretPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function redactLikelySecrets(value: string): string {
  return secretPatterns.reduce((redacted, pattern) => {
    pattern.lastIndex = 0;
    return redacted.replace(pattern, "[clé secrète masquée]");
  }, value);
}

export function maskLikelySecrets(value: string): string {
  return secretPatterns.reduce((masked, pattern) => {
    pattern.lastIndex = 0;
    return masked.replace(pattern, "••••••••••••");
  }, value);
}
