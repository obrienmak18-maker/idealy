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
  return getIdealySupabaseFunctionUrl("process-ai-request");
}

export function getIdealySupabaseFunctionUrl(functionName: string) {
  if (!/^[a-z0-9-]+$/.test(functionName)) {
    throw new Error("Invalid Supabase function name.");
  }

  if (functionName === "process-ai-request") {
    const configuredFunctionUrl = process.env.IDEALY_AI_FUNCTION_URL?.trim();
    if (configuredFunctionUrl) {
      return configuredFunctionUrl.replace(/\/$/, "");
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
  }

  return `${getIdealyApiUrl()}/functions/v1/${functionName}`.replace(
    /\/$/,
    ""
  );
}
