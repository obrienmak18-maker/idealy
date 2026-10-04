import { createClient } from "redis";

import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";

const MAX_MESSAGES = 10;
const TTL_SECONDS = 60 * 60;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => undefined);
    client.connect().catch(() => {
      client = null;
    });
  }
  return client;
}

export async function checkIpRateLimit(
  ip: string | undefined,
  options: { keyPrefix?: string; maxRequests?: number; windowSeconds?: number } = {}
) {
  if (!isProductionEnvironment || !ip) {
    return;
  }

  const redis = getClient();
  if (!redis?.isReady) {
    return;
  }

  try {
    const key = `${options.keyPrefix ?? "ip-rate-limit"}:${ip}`;
    const windowSeconds = options.windowSeconds ?? TTL_SECONDS;
    const maxRequests = options.maxRequests ?? MAX_MESSAGES;
    const [count] = await redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds, "NX")
      .exec();

    if (typeof count === "number" && count > maxRequests) {
      throw new ChatbotError("rate_limit:chat");
    }
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
  }
}
