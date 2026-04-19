import TrialRunnerClient from "./trial-runner";

export function generateStaticParams() {
  return [{ id: "trial-1" }, { id: "trial-2" }, { id: "trial-3" }, { id: "trial-4" }, { id: "trial-5" }, { id: "trial-6" }];
}

export default async function TrialRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TrialRunnerClient id={id} />;
}
