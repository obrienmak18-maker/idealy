export type DesignProviderCategory =
  | "animation"
  | "charts"
  | "design-ai"
  | "icons"
  | "motion"
  | "three-d"
  | "ui-system";

export type DesignFramework =
  | "agnostic"
  | "next"
  | "react"
  | "react-native"
  | "vite"
  | "vue"
  | "svelte";

export type DesignPlatform = "desktop" | "mobile" | "web";

export type DesignProvider = {
  category: DesignProviderCategory;
  combinesWith: string[];
  conflictsWith: string[];
  dependencies: string[];
  description: string;
  frameworks: DesignFramework[];
  id: string;
  instructions: string[];
  limitations: string[];
  name: string;
  platforms: DesignPlatform[];
  priority: number;
  strengths: string[];
  suitableFor: string[];
};

export type DesignAnalysis = {
  accessibility: "high" | "standard";
  audience: string;
  charts: boolean;
  complexity: "high" | "low" | "medium";
  density: "comfortable" | "compact" | "spacious";
  framework: DesignFramework;
  interaction: "high" | "low" | "medium";
  motion: "high" | "low" | "medium";
  platform: DesignPlatform;
  productType: string;
  sector: string;
  threeD: boolean;
  tone: string;
};

export type DesignTokens = {
  borderRadius: "expressive" | "moderate" | "sharp";
  borderStyle: string;
  colorStrategy: string;
  density: string;
  motionDuration: string;
  shadowStrategy: string;
  spacing: string;
  typography: string;
};

export type DesignStack = {
  dependencies: string[];
  providers: string[];
};

export type DesignSpecification = {
  analysis: DesignAnalysis;
  constraints: string[];
  dependencies: string[];
  instructions: string[];
  requestedProviders: string[];
  selectedProviders: string[];
  stack: DesignStack;
  tokens: DesignTokens;
  variationSeed: number;
  version: "1.0";
  visualDirection: {
    name: string;
    rationale: string;
  };
};

export type DesignEngineContext = {
  framework?: DesignFramework;
  platform?: DesignPlatform;
  requestedProviders?: string[];
};
