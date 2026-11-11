import { getSafeSession } from "@/lib/auth/session-token";

export async function GET(request: Request) {
  const session = await getSafeSession(request);
  if (!session?.user) {
    return Response.json(
      { authenticated: false, error: "Une session Firebase Idealy est requise." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    {
      authenticated: true,
      user: {
        email: session.user.email,
        id: session.user.id,
        name: session.user.name,
        type: session.user.type,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
