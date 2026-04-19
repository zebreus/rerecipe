import ProtocolDetailClient from "./protocol-detail";

export function generateStaticParams() {
  return [{ id: "protocol-1" }, { id: "protocol-2" }];
}

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProtocolDetailClient id={id} />;
}
