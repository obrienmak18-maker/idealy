import { auth } from "@/app/(auth)/auth";
import { getFreeQuotaStatus } from "@/lib/idealy/free-quota";

export async function GET() {
  const session = await auth();
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
