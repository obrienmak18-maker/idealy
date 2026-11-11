import { getSafeSession } from "@/lib/auth/session-token";
import { getFreeQuotaStatus } from "@/lib/idealy/free-quota";

export async function GET(request: Request) {
  const session = await getSafeSession(request);
  if (!session?.user?.id) {
    return Response.json(
      { error: "Une session authentifiée est requise." },
      { status: 401 }
    );
  }

  const status = await getFreeQuotaStatus(session.user.id);
  return Response.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
