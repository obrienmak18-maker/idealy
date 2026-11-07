import { auth } from "@/app/(auth)/auth";
import { getFreeQuotaStatus } from "@/lib/idealy/free-quota";
import { verifyFirebaseToken } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (bearer) {
      const fbUser = await verifyFirebaseToken(bearer);
      if (fbUser) {
        userId = fbUser.uid;
      }
    }
  }

  if (!userId) {
    return Response.json(
      { error: "Une session authentifiée est requise." },
      { status: 401 }
    );
  }

  const status = await getFreeQuotaStatus(userId);
  return Response.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
