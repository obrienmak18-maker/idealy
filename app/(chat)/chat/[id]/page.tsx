export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <div aria-hidden="true" className="hidden" />;
}
