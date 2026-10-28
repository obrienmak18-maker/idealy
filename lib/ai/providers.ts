import { customProvider } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { isTestEnvironment } from "../constants";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

function getEnvKey(name: string): string {
  return (
    process.env[name]?.trim() ||
    process.env[`VITE_${name}`]?.trim() ||
    ""
  );
}

// 1. DeepSeek direct
const deepseekApiKey = getEnvKey("DEEPSEEK_API_KEY");
const deepseek = deepseekApiKey
  ? createOpenAI({
      apiKey: deepseekApiKey,
      baseURL: "https://api.deepseek.com",
    })
  : null;

// 2. OpenAI direct
const openaiApiKey = getEnvKey("OPENAI_API_KEY");
const openai = openaiApiKey
  ? createOpenAI({
      apiKey: openaiApiKey,
    })
  : null;

// 3. Groq direct (ultra-fast)
const groqApiKey = getEnvKey("GROQ_API_KEY");
const groq = groqApiKey
  ? createOpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

// 4. OpenRouter direct
const openrouterApiKey = getEnvKey("OPENROUTER_API_KEY");
const openrouter = openrouterApiKey
  ? createOpenAI({
      apiKey: openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
    })
  : null;

// 5. Mistral direct
const mistralApiKey = getEnvKey("MISTRAL_API_KEY");
const mistral = mistralApiKey
  ? createOpenAI({
      apiKey: mistralApiKey,
      baseURL: "https://api.mistral.ai/v1",
    })
  : null;


// 6. Google Gemini direct
const googleApiKey =
  getEnvKey("GOOGLE_GENERATIVE_AI_API_KEY") ||
  getEnvKey("GEMINI_API_KEY");
const google = googleApiKey
  ? createGoogleGenerativeAI({
      apiKey: googleApiKey,
    })
  : null;

function resolveGeminiModelName(modelId: string): string {
  const clean = modelId
    .replace(/^google\//, "")
    .replace(/^gemini\//, "")
    .toLowerCase();

  if (clean.includes("pro")) {
    return "gemini-3.7-flash";
  }
  return "gemini-3.7-flash";
}

function getAnyAvailableDirectModel() {
  if (openrouter) return openrouter.chat("meta-llama/llama-3.3-70b-instruct");
  if (groq) return groq.chat("openai/gpt-oss-120b");
  if (google) return google("gemini-3.7-flash");
  if (openai) return openai.chat("gpt-4o-mini");
  if (deepseek) return deepseek.chat("deepseek-chat");
  if (mistral) return mistral.chat("mistral-large-latest");
  return null;
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // Groq (ultra-rapide, quota actif vérifié)
  if (groq && (modelId.includes("groq") || modelId.includes("gpt-oss") || modelId.includes("llama"))) {
    return groq.chat("openai/gpt-oss-120b");
  }

  // OpenRouter (quota actif vérifié)
  if (openrouter && modelId.includes("openrouter")) {
    const cleanId = modelId.replace(/^openrouter\//, "");
    return openrouter.chat(cleanId === "auto" ? "meta-llama/llama-3.3-70b-instruct" : cleanId);
  }

  // Google / Gemini
  if (google && (modelId.startsWith("google/") || modelId.includes("gemini"))) {
    return google(resolveGeminiModelName(modelId));
  }

  // DeepSeek
  if (deepseek && (modelId.includes("deepseek") || modelId === "deepseek/deepseek-v3.2")) {
    return deepseek.chat("deepseek-chat");
  }

  // OpenAI
  if (openai && (modelId.includes("openai") || modelId.includes("gpt"))) {
    return openai.chat(modelId.includes("mini") ? "gpt-4o-mini" : "gpt-4o");
  }

  // Mistral
  if (mistral && modelId.includes("mistral")) {
    return mistral.chat("mistral-large-latest");
  }

  // Utiliser un fournisseur direct configuré. Ne jamais basculer vers un Gateway payant implicite.
  const fallback = getAnyAvailableDirectModel();
  if (fallback) {
    return fallback;
  }

  throw new Error("Aucun fournisseur IA direct n’est configuré. Le chat doit utiliser le backend Supabase d’Idealy ou disposer d’une clé fournisseur côté serveur.");
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  // Modèle ultra-rapide pour les titres
  if (groq) return groq.chat("openai/gpt-oss-120b");
  if (openrouter) return openrouter.chat("meta-llama/llama-3.3-70b-instruct");
  if (google) return google("gemini-3.7-flash");
  if (deepseek) return deepseek.chat("deepseek-chat");
  if (openai) return openai.chat("gpt-4o-mini");

  const direct = getAnyAvailableDirectModel();
  if (direct) return direct;

  throw new Error("Aucun fournisseur IA direct n’est configuré pour générer le titre.");
}
