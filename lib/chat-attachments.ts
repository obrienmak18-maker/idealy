export const CHAT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

const SAFE_MEDIA_TYPE =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/i;

export function normalizeAttachmentMediaType(value: string): string {
  const normalized = value.trim().toLowerCase().split(";")[0] ?? "";
  if (!normalized || !SAFE_MEDIA_TYPE.test(normalized)) {
    return "application/octet-stream";
  }

  // Active document formats are served as downloads, never as executable web content.
  if (
    [
      "text/html",
      "application/xhtml+xml",
      "image/svg+xml",
      "application/xml",
      "text/xml",
      "application/javascript",
      "text/javascript",
      "text/ecmascript",
      "application/wasm",
      "application/x-msdownload",
      "application/x-shockwave-flash",
    ].includes(normalized)
  ) {
    return "application/octet-stream";
  }
  return normalized;
}

export function safeAttachmentExtension(filename: string): string {
  const separator = filename.lastIndexOf(".");
  if (separator <= 0 || separator === filename.length - 1) {
    return "bin";
  }
  const candidate = filename.slice(separator + 1).toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(candidate) ? candidate : "bin";
}
