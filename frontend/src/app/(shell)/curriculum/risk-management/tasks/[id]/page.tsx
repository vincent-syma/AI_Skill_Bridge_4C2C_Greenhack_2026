import { RiskTaskWorkspace } from "@/features/curriculum/risk-task-workspace";

type Props = { params: Promise<{ id: string }> };

export default async function RiskTaskRoute({ params }: Props) {
  const { id } = await params;
  return <RiskTaskWorkspace taskId={id} />;
}
