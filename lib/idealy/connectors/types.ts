export type ConnectorCategory =
  | "design"
  | "code"
  | "deploy"
  | "data"
  | "communication"
  | "billing";

export type ConnectorAuthMode =
  | "oauth2"
  | "api-key"
  | "service-account"
  | "managed";

export type ConnectorRuntime = "idealy-server" | "supabase-edge" | "manus-only";

export type ConnectorAvailability =
  | "catalog"
  | "planned"
  | "configured"
  | "deprecated";

export type ConnectorCapability =
  | "design-assets-read"
  | "design-assets-write"
  | "design-generation"
  | "design-export"
  | "repository-read"
  | "repository-write"
  | "issue-management"
  | "deployment-preview"
  | "deployment-production"
  | "database-read"
  | "database-write"
  | "file-storage"
  | "document-read"
  | "document-write"
  | "message-send"
  | "billing-read"
  | "billing-write";

export type ConnectorOperation = {
  id: string;
  label: string;
  capability: ConnectorCapability;
  risk: "read" | "write" | "publish" | "financial";
  requiresConfirmation: boolean;
  missionSafe: boolean;
};

export type ConnectorDefinition = {
  id: string;
  provider: string;
  label: string;
  description: string;
  category: ConnectorCategory;
  auth: ConnectorAuthMode;
  runtime: ConnectorRuntime;
  availability: ConnectorAvailability;
  docsUrl: string;
  authorizationUrl?: string;
  scopes: string[];
  operations: ConnectorOperation[];
  dataBoundary: "metadata-only" | "user-selected-assets" | "server-managed";
  secretEnvNames: string[];
  notes: string[];
};

export type ConnectorCatalogFilter = {
  category?: ConnectorCategory;
  capability?: ConnectorCapability;
  availability?: ConnectorAvailability;
  runtime?: ConnectorRuntime;
};

export type ConnectorStatus = {
  connectorId: string;
  connected: boolean;
  providerAccountLabel?: string;
  lastVerifiedAt?: string;
  scopes?: string[];
  errorCode?: "not-connected" | "expired" | "revoked" | "provider-error";
};
