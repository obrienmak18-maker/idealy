import { designProviders, getDesignProvider } from "./providers";
import type {
  DesignAnalysis,
  DesignEngineContext,
  DesignFramework,
  DesignPlatform,
  DesignProvider,
  DesignProviderCategory,
  DesignSpecification,
} from "./types";

const providerAliases: Record<string, string> = {
  "ant design": "ant-design",
  antd: "ant-design",
  chakra: "chakra",
  "css animations": "css-animation",
  "framer motion": "motion",
  gsap: "gsap",
  headless: "headless-ui",
  "headless ui": "headless-ui",
  heroui: "heroui",
  "hero ui": "heroui",
  lucide: "lucide",
  mantine: "mantine",
  material: "material-ui",
  "material ui": "material-ui",
  "material symbols": "material-symbols",
  motion: "motion",
  nextui: "heroui",
  phosphor: "phosphor",
  radix: "radix",
  recharts: "recharts",
  shadcn: "shadcn",
  stitch: "stitch",
  tabler: "tabler",
  "three.js": "three",
  three: "three",
  "react three fiber": "react-three-fiber",
  r3f: "react-three-fiber",
  drei: "drei",
  d3: "d3",
  echarts: "echarts",
};

const explicitProviderPatterns = Object.entries(providerAliases)
  .sort(([left], [right]) => right.length - left.length)
  .map(([pattern, id]) => ({ id, pattern }));

function stableHash(input: string) {
  let hash = 2166136261;
  for (const character of input.toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function includesAny(prompt: string, values: string[]) {
  return values.some((value) => prompt.includes(value));
}

function detectRequestedProviders(prompt: string, requestedProviders: string[] = []) {
  const found = new Set<string>();
  for (const requested of requestedProviders) {
    const normalized = requested.trim().toLowerCase();
    const id = providerAliases[normalized] ?? normalized;
    if (getDesignProvider(id)) found.add(id);
  }
  for (const { id, pattern } of explicitProviderPatterns) {
    if (prompt.includes(pattern)) found.add(id);
  }
  return [...found];
}

function inferFramework(prompt: string, context?: DesignEngineContext): DesignFramework {
  if (context?.framework) return context.framework;
  if (includesAny(prompt, ["react native", "expo", "ios", "android", "mobile app"])) {
    return "react-native";
  }
  if (includesAny(prompt, ["vue", "nuxt"])) return "vue";
  if (includesAny(prompt, ["svelte", "sveltekit"])) return "svelte";
  if (includesAny(prompt, ["vite"])) return "vite";
  if (includesAny(prompt, ["next.js", "nextjs", "next app"])) return "next";
  return "react";
}

function inferPlatform(prompt: string, context?: DesignEngineContext): DesignPlatform {
  if (context?.platform) return context.platform;
  if (includesAny(prompt, ["mobile", "ios", "android", "expo", "phone", "smartphone"])) {
    return "mobile";
  }
  return "web";
}

function inferAnalysis(
  prompt: string,
  context: DesignEngineContext | undefined,
  requestedProviders: string[]
): DesignAnalysis {
  const normalized = prompt.toLowerCase();
  const platform = inferPlatform(normalized, context);
  const framework = inferFramework(normalized, context);
  const productType = includesAny(normalized, ["dashboard", "admin", "analytics", "back-office"])
    ? "dashboard"
    : includesAny(normalized, ["saas", "platform", "workspace", "team"])
      ? "saas"
      : includesAny(normalized, ["landing", "marketing", "brand", "campaign"])
        ? "marketing-site"
        : includesAny(normalized, ["store", "shop", "commerce", "checkout"])
          ? "commerce"
          : includesAny(normalized, ["game", "gaming", "playable"])
            ? "game"
            : includesAny(normalized, ["portfolio", "creative", "agency"])
              ? "portfolio"
              : platform === "mobile"
                ? "mobile-product"
                : "product-interface";
  const sector = includesAny(normalized, ["bank", "fintech", "finance", "payment", "invoice"])
    ? "fintech"
    : includesAny(normalized, ["health", "clinic", "medical", "patient"])
      ? "healthcare"
      : includesAny(normalized, ["education", "course", "school", "learning"])
        ? "education"
        : includesAny(normalized, ["developer", "code", "api", "repository"])
          ? "developer-tool"
          : "general";
  const complexity = normalized.length > 420 || includesAny(normalized, ["multi-agent", "real-time", "enterprise", "marketplace"])
    ? "high"
    : normalized.length > 150
      ? "medium"
      : "low";
  const charts = includesAny(normalized, ["chart", "graph", "analytics", "metrics", "kpi", "visualization"]);
  const threeD = requestedProviders.includes("three") || requestedProviders.includes("react-three-fiber") || requestedProviders.includes("drei") || includesAny(normalized, ["3d", "three.js", "webgl", "shader", "immersive", "spatial"]);
  const motion = requestedProviders.some((id) => ["motion", "gsap", "lottie", "css-animation"].includes(id))
    ? "high"
    : includesAny(normalized, ["animate", "animation", "motion", "transition", "interactive"])
      ? "medium"
      : "low";
  const interaction = includesAny(normalized, ["drag", "filter", "live", "real-time", "editor", "workflow", "interactive"])
    ? "high"
    : complexity === "high"
      ? "medium"
      : "low";
  return {
    accessibility: includesAny(normalized, ["accessible", "accessibility", "wcag", "public", "health", "education"])
      ? "high"
      : "standard",
    audience: includesAny(normalized, ["developer", "engineer", "team", "admin"])
      ? "professional users"
      : "general users",
    charts,
    complexity,
    density: productType === "dashboard" || sector === "fintech" ? "compact" : productType === "marketing-site" ? "spacious" : "comfortable",
    framework,
    interaction,
    motion,
    platform,
    productType,
    sector,
    threeD,
    tone: includesAny(normalized, ["premium", "luxury", "elegant"])
      ? "premium"
      : includesAny(normalized, ["playful", "fun", "friendly"])
        ? "playful"
        : includesAny(normalized, ["futuristic", "cyber", "neon"])
          ? "futuristic"
          : "clear and modern",
  };
}

function providerSupports(provider: DesignProvider, analysis: DesignAnalysis) {
  const frameworkMatches = provider.frameworks.includes("agnostic") || provider.frameworks.includes(analysis.framework);
  const platformMatches = provider.platforms.includes(analysis.platform) || provider.platforms.includes("web");
  return frameworkMatches && platformMatches;
}

function scoreProvider(provider: DesignProvider, analysis: DesignAnalysis, seed: number) {
  let score = provider.priority;
  if (provider.suitableFor.includes("all") || provider.suitableFor.includes(analysis.productType)) score += 30;
  if (provider.suitableFor.includes(analysis.sector)) score += 20;
  if (analysis.charts && provider.category === "charts") score += 40;
  if (analysis.threeD && provider.category === "three-d") score += 60;
  if (analysis.motion !== "low" && provider.category === "motion") score += 25;
  if (analysis.accessibility === "high" && provider.strengths.includes("accessibility")) score += 15;
  if (analysis.density === "compact" && provider.strengths.includes("dashboard")) score += 10;
  score += (seed % 7) / 10;
  return score;
}

function selectCategory(
  category: DesignProviderCategory,
  analysis: DesignAnalysis,
  seed: number,
  requested: Set<string>,
  selected: string[]
) {
  const explicit = [...requested]
    .map((id) => getDesignProvider(id))
    .find((provider) => provider?.category === category);
  if (explicit && providerSupports(explicit, analysis)) return explicit;

  const candidates = designProviders
    .filter((provider) => provider.category === category && providerSupports(provider, analysis))
    .filter((provider) => !provider.conflictsWith.some((id) => selected.includes(id)))
    .sort((left, right) => scoreProvider(right, analysis, seed) - scoreProvider(left, analysis, seed));
  return candidates[0];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function buildDesignSpecification(
  prompt: string,
  context?: DesignEngineContext
): DesignSpecification {
  const normalizedPrompt = prompt.trim();
  const requestedProviders = detectRequestedProviders(
    normalizedPrompt.toLowerCase(),
    context?.requestedProviders
  );
  const analysis = inferAnalysis(normalizedPrompt, context, requestedProviders);
  const variationSeed = stableHash(normalizedPrompt);
  const requested = new Set(requestedProviders);
  const selected: string[] = [];
  const constraints: string[] = [];

  const uiProvider = selectCategory("ui-system", analysis, variationSeed, requested, selected) ?? getDesignProvider("shadcn");
  if (uiProvider) selected.push(uiProvider.id);
  const iconProvider = selectCategory("icons", analysis, variationSeed + 1, requested, selected) ?? getDesignProvider("lucide");
  if (iconProvider) selected.push(iconProvider.id);

  if (analysis.motion !== "low" || requested.has("motion") || requested.has("gsap") || requested.has("lottie")) {
    const motionProvider = selectCategory("motion", analysis, variationSeed + 2, requested, selected) ?? getDesignProvider("css-animation");
    if (motionProvider) selected.push(motionProvider.id);
  } else {
    selected.push("css-animation");
  }

  if (analysis.charts) {
    const dataProvider = selectCategory("charts", analysis, variationSeed + 3, requested, selected) ?? getDesignProvider("recharts");
    if (dataProvider) selected.push(dataProvider.id);
  }

  if (analysis.threeD) {
    const threeProvider = selectCategory("three-d", analysis, variationSeed + 4, requested, selected);
    if (threeProvider) selected.push(threeProvider.id);
    for (const dependency of ["react-three-fiber", "drei"]) {
      const provider = getDesignProvider(dependency);
      if (provider && providerSupports(provider, analysis) && !provider.conflictsWith.some((id) => selected.includes(id))) {
        selected.push(provider.id);
      }
    }
    constraints.push("Provide a performant non-WebGL fallback, reduced-motion behavior and accessible alternative content.");
  }

  for (const requestedId of requested) {
    const provider = getDesignProvider(requestedId);
    if (!provider) continue;
    if (!providerSupports(provider, analysis)) {
      constraints.push(`The requested provider ${provider.name} is not compatible with ${analysis.framework}/${analysis.platform}; explain the conflict and propose an alternative.`);
    }
    if (!selected.includes(requestedId) && provider.category === "design-ai") selected.push(requestedId);
    if (provider.category === "design-ai") {
      constraints.push(`${provider.name} is an optional design capability; do not claim a runtime integration unless an official connector is configured.`);
    }
  }

  const uniqueSelected = unique(selected);
  const selectedDefinitions = uniqueSelected.map((id) => getDesignProvider(id)).filter((provider): provider is DesignProvider => Boolean(provider));
  const requestedDefinitions = requestedProviders.map((id) => getDesignProvider(id)).filter((provider): provider is DesignProvider => Boolean(provider));
  const requestedUiSystems = requestedDefinitions.filter((provider) => provider.category === "ui-system");
  if (requestedUiSystems.length > 1) {
    constraints.push(`Conflicting full UI systems were requested: ${requestedUiSystems.map((provider) => provider.name).join(", ")}. Keep ${uiProvider?.name ?? "the highest-scoring compatible system"} as the implementation and explain the alternative.`);
  }
  for (const requestedProvider of requestedDefinitions) {
    if (!uniqueSelected.includes(requestedProvider.id) && requestedProvider.category !== "design-ai") {
      constraints.push(`The requested provider ${requestedProvider.name} was not selected as the primary implementation; explain the conflict and do not silently present it as installed.`);
    }
  }
  for (const provider of selectedDefinitions) {
    for (const conflict of provider.conflictsWith) {
      if (uniqueSelected.includes(conflict)) {
        constraints.push(`Do not combine ${provider.name} with ${getDesignProvider(conflict)?.name ?? conflict} unless the user explicitly requires both.`);
      }
    }
  }

  const dependencies = unique(
    selectedDefinitions.flatMap((provider) => provider.dependencies)
  );
  const designDirection = analysis.tone === "futuristic"
    ? { name: "Futuristic clarity", rationale: "Use restrained glow, strong hierarchy and purposeful motion without sacrificing readability." }
    : analysis.tone === "premium"
      ? { name: "Premium product", rationale: "Use a restrained palette, generous hierarchy and high-quality states." }
      : analysis.productType === "dashboard"
        ? { name: "Focused operations", rationale: "Prioritize scanability, compact density and clear status feedback." }
        : { name: "Confident utility", rationale: "Keep the product clear, responsive and expressive only where it helps the user." };

  const tokens = {
    borderRadius: analysis.tone === "premium" ? "moderate" : analysis.tone === "playful" ? "expressive" : "moderate",
    borderStyle: analysis.tone === "futuristic" ? "subtle translucent borders" : "1px neutral borders with strong focus states",
    colorStrategy: analysis.tone === "futuristic" ? "dark base with one accent and restrained glow" : "neutral base with one primary accent and semantic states",
    density: analysis.density,
    motionDuration: analysis.motion === "high" ? "160-320ms, never blocking content" : "120-220ms, transform and opacity first",
    shadowStrategy: "use elevation only for hierarchy; avoid stacked cards",
    spacing: analysis.density === "compact" ? "4/8/12/16/24" : "4/8/16/24/32",
    typography: analysis.productType === "dashboard" ? "highly legible sans-serif with tabular numbers" : "clear sans-serif with a distinct display hierarchy",
  } as const;

  return {
    analysis,
    constraints: unique(constraints),
    dependencies,
    instructions: unique([
      "Treat this specification as the source of visual direction before writing UI code.",
      "Respect explicit user technology choices over automatic selection.",
      "Install only the selected dependencies; do not create a dependency factory.",
      "Use semantic HTML, keyboard navigation, visible focus and prefers-reduced-motion.",
      ...selectedDefinitions.flatMap((provider) => provider.instructions),
    ]),
    requestedProviders,
    selectedProviders: uniqueSelected,
    stack: { dependencies, providers: uniqueSelected },
    tokens,
    variationSeed,
    version: "1.0",
    visualDirection: designDirection,
  };
}

export function designSpecificationToPrompt(specification: DesignSpecification) {
  return [
    "DESIGN ENGINE SPECIFICATION — follow this before generating UI code:",
    `Product: ${specification.analysis.productType}; sector: ${specification.analysis.sector}; platform: ${specification.analysis.platform}; framework: ${specification.analysis.framework}.`,
    `Audience: ${specification.analysis.audience}; tone: ${specification.analysis.tone}; density: ${specification.analysis.density}; interaction: ${specification.analysis.interaction}; motion: ${specification.analysis.motion}; charts: ${specification.analysis.charts}; 3D: ${specification.analysis.threeD}.`,
    `Direction: ${specification.visualDirection.name} — ${specification.visualDirection.rationale}`,
    `Selected design capabilities: ${specification.selectedProviders.join(", ")}.`,
    `Dependencies allowed for this design stack: ${specification.dependencies.join(", ") || "none beyond the project"}.`,
    `Tokens: ${JSON.stringify(specification.tokens)}.`,
    `Rules: ${specification.instructions.join(" ")}`,
    specification.constraints.length > 0 ? `Constraints: ${specification.constraints.join(" ")}` : "",
    "Return a coherent, responsive, accessible interface. Do not silently replace an explicitly requested provider.",
  ].filter(Boolean).join("\n");
}

export * from "./types";
export * from "./critic";
export * from "./serializer";
export { designProviders, getDesignProvider, listDesignProviders } from "./providers";
