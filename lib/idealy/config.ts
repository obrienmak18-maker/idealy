const DEFAULT_IDEALY_API_URL = "http://localhost:3001";

export function getIdealyApiUrl() {
  return (process.env.IDEALY_API_URL ?? DEFAULT_IDEALY_API_URL).replace(
    /\/$/,
    ""
  );
}
