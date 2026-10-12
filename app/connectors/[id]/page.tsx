import { notFound } from "next/navigation";
import { getConnectorDefinition } from "@/lib/idealy/connectors";
import { ConnectorDetailView } from "@/components/connectors/connector-detail-view";

export default async function ConnectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const connector = getConnectorDefinition(id);

  if (!connector) {
    notFound();
  }

  return <ConnectorDetailView connector={connector} />;
}
