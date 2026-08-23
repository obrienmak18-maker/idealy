const DEFAULT_IDEALY_API_URL = "http://localhost:3001";

export type IdealyAiProvider = "gateway" | "supabase-function";

export function getIdealyAiProvider(): IdealyAiProvider {
  return process.env.IDEALY_AI_PROVIDER === "supabase-function"
    ? "supabase-function"
    : "gateway";
}

export function getIdealyApiUrl() {
  return (process.env.IDEALY_API_URL ?? DEFAULT_IDEALY_API_URL).replace(
    /\/$/,
    ""
  );
}

export function getIdealyAiFunctionUrl() {
  return (
    process.env.IDEALY_AI_FUNCTION_URL ??
    `${getIdealyApiUrl()}/functions/v1/process-ai-request`
  ).replace(/\/$/, "");
}
