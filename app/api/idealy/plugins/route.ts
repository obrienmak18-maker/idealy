import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { describePlugins } from "@/lib/idealy/plugins/service";
import { getVerifiedUserPlan } from "@/lib/idealy/plugins/service";

/**
 * Returns the caller's plugin states.
 *
 * Every plugin is projected from real server facts, so an entry is only
 * `available` when it is genuinely installed, configured and authorized.
 */
export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;

  if (!accessToken) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: { "Cache-Control": "no-store" }, status: 401 }
    );
  }

  const { error: planError, plan } = await getVerifiedUserPlan({ accessToken });
  if (planError || !plan) {
    return Response.json(
      { error: planError ?? "Le plan n’a pas pu être vérifié." },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    );
  }

  const { error, plugins } = await describePlugins({ accessToken, plan });

  if (error) {
    return Response.json(
      { error },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    );
  }

  return Response.json(
    { plan, plugins, version: 1 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
