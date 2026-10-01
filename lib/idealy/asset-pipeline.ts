export type IdealyAssetType = "logo" | "icon" | "illustration" | "avatar" | "background" | "image" | "brand";
export type IdealyAssetFormat = "svg" | "png" | "jpg" | "webp" | "tsx" | "css";
export type IdealyAssetStatus = "generated" | "candidate" | "approved" | "used" | "rejected";

export type IdealyAssetManifest = {
  id: string;
  name: string;
  type: IdealyAssetType;
  format: IdealyAssetFormat;
  dimensions?: { width: number; height: number };
  source: "generated" | "existing-library" | "user-upload" | "code";
  version: number;
  location?: string;
  usage: string[];
  status: IdealyAssetStatus;
  transparentBackground?: boolean;
  visualChecks: {
    dimensions: "pending" | "passed" | "failed";
    artifacts: "pending" | "passed" | "failed";
    consistency: "pending" | "passed" | "failed";
  };
};

export function createAssetManifest(input: Omit<IdealyAssetManifest, "version" | "status" | "visualChecks">): IdealyAssetManifest {
  return {
    ...input,
    version: 1,
    status: "generated",
    visualChecks: { dimensions: "pending", artifacts: "pending", consistency: "pending" },
  };
}

export function approveAsset(manifest: IdealyAssetManifest): IdealyAssetManifest {
  const checks = Object.values(manifest.visualChecks);
  if (checks.some((check) => check !== "passed")) {
    throw new Error("Asset cannot be approved before all visual checks pass");
  }
  return { ...manifest, status: "approved" };
}

export function createAssetVersion(manifest: IdealyAssetManifest, location?: string): IdealyAssetManifest {
  return {
    ...manifest,
    location: location ?? manifest.location,
    version: manifest.version + 1,
    status: "candidate",
    visualChecks: { dimensions: "pending", artifacts: "pending", consistency: "pending" },
  };
}

export function preferredAssetRepresentation(type: IdealyAssetType): "icon-library" | "svg" | "raster" {
  if (type === "icon") return "icon-library";
  if (type === "logo" || type === "brand") return "svg";
  return "raster";
}
