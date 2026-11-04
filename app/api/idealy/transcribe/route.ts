import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";

export const maxDuration = 30;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/m4a"];

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

/** Sonde : la transcription est-elle disponible pour cette session ? */
export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  if (!token) return json({ available: false }, 401);
  return process.env.OPENAI_API_KEY?.trim() ? json({ available: true }) : json({ available: false }, 503);
}

/**
 * Dictée précise via Whisper (OpenAI). Réservé aux sessions authentifiées.
 * Si la clé n'est pas disponible côté serveur, répond 503 : l'interface retombe alors
 * sur la dictée du navigateur.
 */
export async function POST(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  if (!token) return json({ error: "Une session Idealy authentifiée est requise." }, 401);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return json({ error: "La transcription n’est pas configurée." }, 503);

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return json({ error: "Aucun enregistrement reçu." }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return json({ error: "Enregistrement trop long." }, 413);
  const baseType = audio.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(baseType)) return json({ error: "Format audio non pris en charge." }, 415);

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "dictation.webm");
  upstream.append("model", process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "whisper-1");
  const language = form?.get("language");
  if (typeof language === "string" && /^[a-z]{2}$/i.test(language)) upstream.append("language", language.toLowerCase());

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    body: upstream,
    headers: { Authorization: `Bearer ${apiKey}` },
    method: "POST",
  }).catch(() => null);
  if (!response?.ok) return json({ error: "La transcription a échoué." }, 502);

  const data = (await response.json().catch(() => null)) as { text?: string } | null;
  return json({ text: typeof data?.text === "string" ? data.text.trim() : "" });
}
