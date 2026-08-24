export type IdealyDirectProvider =
  | "anthropic"
  | "deepseek"
  | "gemini"
  | "groq"
  | "moonshot"
  | "openai"
  | "openrouter"
  | "together";

export type IdealyProviderModel = {
  capabilities: {
    reasoning: boolean;
    tools: boolean;
    vision: boolean;
  };
  description: string;
  edgeModel: string;
  edgeProvider: IdealyDirectProvider;
  id: string;
  name: string;
};

/**
 * Catalogue sans credentials. Il décrit uniquement les intégrations que
 * l’Edge Function sait router. Les modèles ne deviennent visibles dans l’UI
 * que lorsque IDEALY_DIRECT_MODEL_CATALOG=true est activé côté serveur.
 */
export const idealyDirectProviderModels: IdealyProviderModel[] = [
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Kimi K3 pour le code et les missions longues",
    edgeModel: "kimi-k3",
    edgeProvider: "moonshot",
    id: "moonshot/kimi-k3",
    name: "Kimi K3",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Kimi K2.5 compatible avec le catalogue historique",
    edgeModel: "kimi-k2.5",
    edgeProvider: "moonshot",
    id: "moonshot/kimi-k2.5",
    name: "Kimi K2.5",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Alias direct du modèle historique du Gateway",
    edgeModel: "kimi-k2.5",
    edgeProvider: "moonshot",
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5 · direct",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Modèle open source rapide via Together AI",
    edgeModel: "openai/gpt-oss-120b",
    edgeProvider: "together",
    id: "together/openai/gpt-oss-120b",
    name: "GPT OSS 120B · Together",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: true },
    description: "Gemini rapide et multimodal",
    edgeModel: "gemini-3.7-flash",
    edgeProvider: "gemini",
    id: "gemini/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: true },
    description: "Claude équilibré pour le raisonnement et le code",
    edgeModel: "claude-sonnet-4-6",
    edgeProvider: "anthropic",
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "GPT-5 direct lorsque la clé OpenAI est configurée",
    edgeModel: "gpt-5",
    edgeProvider: "openai",
    id: "openai/gpt-5",
    name: "GPT-5 · OpenAI",
  },
  {
    capabilities: { reasoning: false, tools: true, vision: false },
    description: "Inférence rapide pour les réponses conversationnelles",
    edgeModel: "llama-3.3-70b-versatile",
    edgeProvider: "groq",
    id: "groq/llama-3.3-70b-versatile",
    name: "Llama 3.3 70B · Groq",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Routage et fallback multi-modèles via OpenRouter",
    edgeModel: "openrouter/free",
    edgeProvider: "openrouter",
    id: "openrouter/openrouter/free",
    name: "OpenRouter Free",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "DeepSeek direct pour le code et le raisonnement",
    edgeModel: "deepseek-chat",
    edgeProvider: "deepseek",
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
  },
];

export function getIdealyDirectProviderModel(modelId: string) {
  return idealyDirectProviderModels.find((model) => model.id === modelId);
}

export function isIdealyDirectModelCatalogEnabled() {
  return process.env.IDEALY_DIRECT_MODEL_CATALOG === "true";
}
