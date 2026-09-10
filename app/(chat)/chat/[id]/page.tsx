import { ChatShell } from "@/components/chat/shell";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <ChatShell />;
}
