import { ChatShell } from "@/components/chat/shell";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ draft?: string }>;
}) {
  const params = await searchParams;
  const initialPrompt = params?.draft?.slice(0, 2000);
  return <ChatShell initialPrompt={initialPrompt} />;
}
