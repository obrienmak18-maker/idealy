import { getConfiguredDirectProviderNames } from "@/lib/ai/providers";

export async function GET() {
  if (process.env.DEMO_MODE === "true") {
    return Response.json({
      mode: "demo",
      service: "idealy-chat",
      status: "ready",
    });
  }

  const usesSupabaseFunction =
    process.env.IDEALY_AI_PROVIDER === "supabase-function";
  const supabaseFunctionConfigured = Boolean(
    process.env.IDEALY_AI_FUNCTION_URL?.trim() ||
      (process.env.SUPABASE_URL?.trim() &&
        process.env.SUPABASE_ANON_KEY?.trim()),
  );
  const configuredProviders = usesSupabaseFunction
    ? supabaseFunctionConfigured
      ? ["Supabase Edge Function"]
      : []
    : getConfiguredDirectProviderNames();

  if (configuredProviders.length === 0) {
    return Response.json(
      {
        error: "Aucun fournisseur IA n’est configuré côté serveur.",
        mode: "unconfigured",
        service: "idealy-chat",
        status: "error",
      },
      { status: 503 },
    );
  }

  return Response.json({
    mode: "configured",
    providers: configuredProviders,
    service: "idealy-chat",
    status: "configured",
  });
}
