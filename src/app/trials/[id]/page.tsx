import TrialDetailClient from "./trial-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "trial-1" }];
}

export default async function TrialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TrialDetailClient id={id} />;
}
