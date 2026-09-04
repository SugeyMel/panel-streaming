import { Card } from "@/components/ui/Card";
import type { DashboardStat } from "@/lib/types";

export function StatCard({ stat }: { stat: DashboardStat }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-400">{stat.label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {stat.value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
    </Card>
  );
}
