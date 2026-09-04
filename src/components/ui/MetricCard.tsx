import { Card } from "@/components/ui/Card";

export function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs font-medium tracking-wide text-[#94A3B8] uppercase">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-[1.65rem] ${
          tone === "warning" ? "text-[#F59E0B]" : "text-[#F8FAFC]"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs font-medium text-[#22C55E]">{hint}</p> : null}
    </Card>
  );
}
