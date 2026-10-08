/** Local IP helper — replaces @vercel/functions */
function ipAddress(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? undefined;
}
import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";
import { getLinkPreview, normalizePreviewUrl } from "@/lib/link-preview";
import { checkIpRateLimit } from "@/lib/ratelimit";

function json(body: unknown, status: number) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
    },
    status,
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return json({ error: "Authentication required." }, 401);
  }

  const value = new URL(request.url).searchParams.get("url") ?? "";
  if (value.length > 2048 || !normalizePreviewUrl(value)) {
    return json(
      { error: "Enter a public HTTP or HTTPS website address." },
      400
    );
  }

  try {
    await checkIpRateLimit(ipAddress(request), {
      keyPrefix: "ip-rate-limit:link-preview",
      maxRequests: 40,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return json(
        { error: "Too many preview requests. Try again shortly." },
        429
      );
    }
    return json({ error: "Preview is temporarily unavailable." }, 503);
  }

  try {
    const preview = await getLinkPreview(value);
    if (!preview) {
      return json({ error: "This address cannot be previewed." }, 400);
    }
    return json(preview, 200);
  } catch {
    return json(
      { error: "A preview could not be retrieved for this website." },
      422
    );
  }
}
