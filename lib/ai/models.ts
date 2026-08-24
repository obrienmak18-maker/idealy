export const DEFAULT_CHAT_MODEL = "moonshotai/kimi-k2.5";

export const titleModel = {
  description: "Fast model for title generation",
  gatewayOrder: ["fireworks", "bedrock"],
  id: "moonshotai/kimi-k2.5",
  name: "Kimi K2.5",
  provider: "moonshotai",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  edgeProvider?: string;
  edgeModel?: string;
  capabilities?: ModelCapabilities;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

const gatewayChatModels: ChatModel[] = [
  {
    description: "Fast and capable model with tool use",
    gatewayOrder: ["bedrock", "deepinfra"],
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
  },
  {
    description: "Moonshot AI flagship model",
    gatewayOrder: ["fireworks", "bedrock"],
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "moonshotai",
  },
  {
    description: "Compact reasoning model",
    gatewayOrder: ["groq", "bedrock"],
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    provider: "openai",
    reasoningEffort: "low",
  },
  {
    description: "Open-source 120B parameter model",
    gatewayOrder: ["fireworks", "bedrock"],
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "openai",
    reasoningEffort: "low",
  },
  {
    description: "Fast non-reasoning model with tool use",
    gatewayOrder: ["xai"],
    id: "xai/grok-4.1-fast-non-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xai",
  },
];

const directChatModels: ChatModel[] = [
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Kimi K3 pour le code et les missions longues",
    edgeModel: "kimi-k3",
    edgeProvider: "moonshot",
    id: "moonshot/kimi-k3",
    name: "Kimi K3",
    provider: "moonshot",
    reasoningEffort: "high",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: true },
    description: "Gemini multimodal pour les interfaces et les fichiers",
    edgeModel: "gemini-3.7-flash",
    edgeProvider: "gemini",
    id: "gemini/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "gemini",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: true },
    description: "Claude Sonnet pour le raisonnement et la qualité du code",
    edgeModel: "claude-sonnet-4-6",
    edgeProvider: "anthropic",
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    reasoningEffort: "medium",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "GPT OSS rapide via Together AI",
    edgeModel: "openai/gpt-oss-120b",
    edgeProvider: "together",
    id: "together/openai/gpt-oss-120b",
    name: "GPT OSS 120B · Together",
    provider: "together",
  },
  {
    capabilities: { reasoning: false, tools: true, vision: false },
    description: "Llama rapide pour les conversations à faible latence",
    edgeModel: "llama-3.3-70b-versatile",
    edgeProvider: "groq",
    id: "groq/llama-3.3-70b-versatile",
    name: "Llama 3.3 70B · Groq",
    provider: "groq",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "DeepSeek direct pour le code et le raisonnement",
    edgeModel: "deepseek-chat",
    edgeProvider: "deepseek",
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    reasoningEffort: "medium",
  },
  {
    capabilities: { reasoning: true, tools: true, vision: false },
    description: "Fallback multi-modèles via OpenRouter",
    edgeModel: "openrouter/free",
    edgeProvider: "openrouter",
    id: "openrouter/openrouter/free",
    name: "OpenRouter Free",
    provider: "openrouter",
  },
];

export const chatModels: ChatModel[] =
  process.env.NEXT_PUBLIC_IDEALY_DIRECT_MODEL_CATALOG === "true"
    ? [...gatewayChatModels, ...directChatModels]
    : gatewayChatModels;

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  const results = await Promise.all(
    chatModels.map(async (model) => {
      try {
        if (model.capabilities) {
          return [model.id, model.capabilities];
        }
        const res = await fetch(
          `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
          { next: { revalidate: 86_400 } }
        );
        if (!res.ok) {
          return [model.id, { reasoning: false, tools: false, vision: false }];
        }

        const json = await res.json();
        const endpoints = json.data?.endpoints ?? [];
        const params = new Set(
          endpoints.flatMap(
            (e: { supported_parameters?: string[] }) =>
              e.supported_parameters ?? []
          )
        );
        const inputModalities = new Set(
          json.data?.architecture?.input_modalities ?? []
        );

        return [
          model.id,
          {
            reasoning: params.has("reasoning"),
            tools: params.has("tools"),
            vision: inputModalities.has("image"),
          },
        ];
      } catch {
        return [model.id, { reasoning: false, tools: false, vision: false }];
      }
    })
  );

  return Object.fromEntries(results);
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((m: GatewayModel) => m.type === "language")
      .map((m: GatewayModel) => ({
        capabilities: {
          reasoning: m.tags?.includes("reasoning") ?? false,
          tools: m.tags?.includes("tool-use") ?? false,
          vision: m.tags?.includes("vision") ?? false,
        },
        description: "",
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

type GatewayEndpoint = {
  provider_name?: string;
  status?: number;
  uptime_last_15m?: number;
  uptime_last_1h?: number;
  latency_last_1h?: {
    p50?: number;
    p95?: number;
  };
};

const PROVIDER_IMPACTED_UPTIME_THRESHOLD = 99;
const PROVIDER_IMPACTED_P50_MS = 10_000;
const PROVIDER_IMPACTED_P95_MS = 30_000;

function isEndpointImpacted(endpoint: GatewayEndpoint) {
  return (
    (endpoint.status !== undefined && endpoint.status !== 0) ||
    (endpoint.uptime_last_15m !== undefined &&
      endpoint.uptime_last_15m < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.uptime_last_1h !== undefined &&
      endpoint.uptime_last_1h < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.latency_last_1h?.p50 !== undefined &&
      endpoint.latency_last_1h.p50 > PROVIDER_IMPACTED_P50_MS) ||
    (endpoint.latency_last_1h?.p95 !== undefined &&
      endpoint.latency_last_1h.p95 > PROVIDER_IMPACTED_P95_MS)
  );
}

export async function getModelAvailability(
  modelId: string
): Promise<ModelAvailability> {
  const model = chatModels.find((item) => item.id === modelId);

  if (!model) {
    return "unknown";
  }

  try {
    const res = await fetch(
      `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return "unknown";
    }

    const json = await res.json();
    const endpoints = (json.data?.endpoints ?? []) as GatewayEndpoint[];

    if (endpoints.length === 0) {
      return "unknown";
    }

    return endpoints.some(isEndpointImpacted) ? "impacted" : "healthy";
  } catch {
    return "unknown";
  }
}
