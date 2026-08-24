import { connectorCatalog } from "./catalog";
import type {
  ConnectorCatalogFilter,
  ConnectorDefinition,
  ConnectorStatus,
} from "./types";

export * from "./types";
export { connectorCatalog, listConnectorDefinitions } from "./catalog";

export function getConnectorDefinition(connectorId: string) {
  return connectorCatalog.find((connector) => connector.id === connectorId);
}

export function filterConnectorCatalog(filter: ConnectorCatalogFilter = {}) {
  return connectorCatalog.filter((connector) => {
    if (filter.category && connector.category !== filter.category) return false;
    if (filter.availability && connector.availability !== filter.availability) {
      return false;
    }
    if (filter.runtime && connector.runtime !== filter.runtime) return false;
    if (
      filter.capability &&
      !connector.operations.some(
        (operation) => operation.capability === filter.capability
      )
    ) {
      return false;
    }
    return true;
  });
}

export function toPublicConnectorDefinition(
  connector: ConnectorDefinition
): Omit<ConnectorDefinition, "secretEnvNames"> & {
  requiresServerConfiguration: boolean;
} {
  const { secretEnvNames, ...publicConnector } = connector;
  return {
    ...publicConnector,
    requiresServerConfiguration: secretEnvNames.length > 0,
  };
}

export function toPublicConnectorStatus(
  status: ConnectorStatus
): ConnectorStatus {
  return {
    connectorId: status.connectorId,
    connected: status.connected,
    ...(status.providerAccountLabel
      ? { providerAccountLabel: status.providerAccountLabel }
      : {}),
    ...(status.lastVerifiedAt
      ? { lastVerifiedAt: status.lastVerifiedAt }
      : {}),
    ...(status.scopes ? { scopes: status.scopes } : {}),
    ...(status.errorCode ? { errorCode: status.errorCode } : {}),
  };
}
