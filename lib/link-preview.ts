import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 4500;

export type LinkPreviewMetadata = {
  description: string | null;
  host: string;
  siteName: string;
  title: string;
  url: string;
};

export function isPublicIpv4(value: string) {
  if (isIP(value) !== 4) {
    return false;
  }
  const parts = value.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  const c = parts[2] ?? -1;

  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function normalizePreviewUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const unbracketedHostname = hostname.replace(/^\[|\]$/g, "");
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !hostname ||
      isIP(unbracketedHostname) !== 0 ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      url.port
    ) {
      return null;
    }
    url.hostname = hostname;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, digits: string) =>
      String.fromCodePoint(Number(digits))
    )
    .replace(/&#x([\da-f]+);/gi, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16))
    );
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = new Map<string, string>();
    for (const match of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    )) {
      const name = match[1]?.toLowerCase();
      if (name) {
        attrs.set(name, match[2] ?? match[3] ?? match[4] ?? "");
      }
    }
    const label = (
      attrs.get("property") ??
      attrs.get("name") ??
      ""
    ).toLowerCase();
    if (label === key) {
      return attrs.get("content")?.trim() || null;
    }
  }
  return null;
}

export function parseLinkPreviewHtml(
  html: string,
  url: URL
): LinkPreviewMetadata {
  const head = html.slice(0, 160_000);
  const rawTitle =
    metaContent(head, "og:title") ??
    metaContent(head, "twitter:title") ??
    head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
    url.hostname;
  const rawDescription =
    metaContent(head, "og:description") ??
    metaContent(head, "description") ??
    metaContent(head, "twitter:description");

  return {
    description: rawDescription
      ? decodeHtml(rawDescription).replace(/\s+/g, " ").slice(0, 260)
      : null,
    host: url.hostname,
    siteName: decodeHtml(
      metaContent(head, "og:site_name") ?? url.hostname
    ).slice(0, 80),
    title: decodeHtml(rawTitle.replace(/<[^>]*>/g, ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120),
    url: url.toString(),
  };
}

async function resolvePinnedIpv4(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  const ipv4 = addresses.filter((item) => isIP(item.address) === 4);
  if (ipv4.length === 0 || ipv4.some((item) => !isPublicIpv4(item.address))) {
    throw new Error("Public IPv4 address required");
  }
  const [firstAddress] = ipv4;
  if (!firstAddress) {
    throw new Error("Public IPv4 address required");
  }
  return firstAddress.address;
}

function readHtml(
  url: URL,
  address: string
): Promise<{
  body: string;
  location: string | null;
  status: number;
  contentType: string;
}> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(
      {
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9",
          "Accept-Encoding": "identity",
          "User-Agent": "IdealyLinkPreview/1.0 (+https://idealy.app)",
        },
        hostname: url.hostname,
        lookup: (_hostname, _options, callback) => callback(null, address, 4),
        method: "GET",
        path: `${url.pathname}${url.search}`,
        port: url.port || undefined,
        servername: url.hostname,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location ?? null;
        const contentType = response.headers["content-type"] ?? "";
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.destroy();
          resolve({ body: "", contentType, location, status });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error("Preview source returned an error"));
          return;
        }
        if (!contentType.toLowerCase().includes("text/html")) {
          response.resume();
          reject(new Error("Preview source is not HTML"));
          return;
        }

        const declaredLength = Number(response.headers["content-length"] ?? 0);
        if (declaredLength > MAX_HTML_BYTES) {
          response.destroy(new Error("Preview response too large"));
          reject(new Error("Preview response too large"));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buffer.length;
          if (totalBytes > MAX_HTML_BYTES) {
            response.destroy(new Error("Preview response too large"));
            reject(new Error("Preview response too large"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            contentType,
            location,
            status,
          });
        });
        response.on("error", reject);
      }
    );
    const hardTimeout = setTimeout(
      () => request.destroy(new Error("Preview timed out")),
      REQUEST_TIMEOUT_MS
    );
    request.on("close", () => clearTimeout(hardTimeout));
    request.setTimeout(REQUEST_TIMEOUT_MS, () =>
      request.destroy(new Error("Preview timed out"))
    );
    request.on("error", reject);
    request.end();
  });
}

async function followPreviewRedirect(
  url: URL,
  redirectsRemaining: number
): Promise<LinkPreviewMetadata> {
  const address = await resolvePinnedIpv4(url.hostname);
  const response = await readHtml(url, address);
  if (!response.location) {
    return parseLinkPreviewHtml(response.body, url);
  }
  if (redirectsRemaining === 0) {
    throw new Error("Too many preview redirects");
  }
  const next = normalizePreviewUrl(new URL(response.location, url).toString());
  if (!next) {
    throw new Error("Unsafe preview redirect");
  }
  return followPreviewRedirect(next, redirectsRemaining - 1);
}

export function getLinkPreview(
  value: string
): Promise<LinkPreviewMetadata | null> {
  const url = normalizePreviewUrl(value);
  if (!url) {
    return Promise.resolve(null);
  }
  return followPreviewRedirect(url, MAX_REDIRECTS);
}
