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
  const configuredFunctionUrl = process.env.IDEALY_AI_FUNCTION_URL?.trim();
  if (configuredFunctionUrl) {
    return configuredFunctionUrl.replace(/\/$/, "");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/process-ai-request`;
  }

  return `${getIdealyApiUrl()}/functions/v1/process-ai-request`.replace(
    /\/$/,
    ""
  );
}
