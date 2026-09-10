import { customProvider, gateway } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

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
      baseURL: "https://api.deepseek.com/v1",
      compatibility: "compatible",
    })
  : null;

// 2. OpenAI direct
const openaiApiKey = getEnvKey("OPENAI_API_KEY");
const openai = openaiApiKey
  ? createOpenAI({
      apiKey: openaiApiKey,
      compatibility: "strict",
    })
  : null;

// 3. Groq direct (ultra-fast)
const groqApiKey = getEnvKey("GROQ_API_KEY");
const groq = groqApiKey
  ? createOpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
      compatibility: "compatible",
    })
  : null;

// 4. OpenRouter direct
const openrouterApiKey = getEnvKey("OPENROUTER_API_KEY");
const openrouter = openrouterApiKey
  ? createOpenAI({
      apiKey: openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
      compatibility: "compatible",
    })
  : null;

// 5. Mistral direct
const mistralApiKey = getEnvKey("MISTRAL_API_KEY");
const mistral = mistralApiKey
  ? createOpenAI({
      apiKey: mistralApiKey,
      baseURL: "https://api.mistral.ai/v1",
      compatibility: "compatible",
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

  if (clean.includes("2.0")) {
    return "gemini-2.0-flash";
  }
  if (clean.includes("1.5-flash")) {
    return "gemini-1.5-flash";
  }
  if (clean.includes("pro")) {
    return "gemini-1.5-pro";
  }
  return "gemini-2.0-flash";
}

function getAnyAvailableDirectModel() {
  if (deepseek) return deepseek("deepseek-chat");
  if (openai) return openai("gpt-4o");
  if (groq) return groq("llama-3.3-70b-versatile");
  if (google) return google("gemini-2.0-flash");
  if (openrouter) return openrouter("auto");
  if (mistral) return mistral("mistral-large-latest");
  return null;
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // DeepSeek
  if (deepseek && (modelId.includes("deepseek") || modelId === "deepseek/deepseek-v3.2")) {
    return deepseek("deepseek-chat");
  }

  // OpenAI
  if (openai && (modelId.includes("openai") || modelId.includes("gpt"))) {
    return openai(modelId.includes("mini") ? "gpt-4o-mini" : "gpt-4o");
  }

  // Groq
  if (groq && (modelId.includes("groq") || modelId.includes("llama"))) {
    return groq("llama-3.3-70b-versatile");
  }

  // Google / Gemini
  if (google && (modelId.startsWith("google/") || modelId.includes("gemini"))) {
    return google(resolveGeminiModelName(modelId));
  }

  // Mistral
  if (mistral && modelId.includes("mistral")) {
    return mistral("mistral-large-latest");
  }

  // OpenRouter
  if (openrouter && modelId.includes("openrouter")) {
    return openrouter(modelId.replace(/^openrouter\//, ""));
  }

  // Si on est en environnement local sans Vercel AI Gateway configurée,
  // on utilise le premier provider IA disponible pour garantir que l'IA répond toujours !
  if (!process.env.AI_GATEWAY_API_KEY) {
    const fallback = getAnyAvailableDirectModel();
    if (fallback) {
      return fallback;
    }
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  // Modèle rapide pour les titres
  if (groq) return groq("llama-3.3-70b-versatile");
  if (deepseek) return deepseek("deepseek-chat");
  if (google) return google("gemini-2.0-flash");
  if (openai) return openai("gpt-4o-mini");

  const direct = getAnyAvailableDirectModel();
  if (direct) return direct;

  return gateway.languageModel(titleModel.id);
}
