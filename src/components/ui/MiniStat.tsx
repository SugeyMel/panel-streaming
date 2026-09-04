import { Card } from "@/components/ui/Card";

export function MiniStat({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string | number;
  tone?: "cyan" | "warning" | "sky" | "white";
}) {
  const color =
    tone === "warning"
      ? "text-[#F59E0B]"
      : tone === "sky"
        ? "text-[#38BDF8]"
        : tone === "white"
          ? "text-[#F8FAFC]"
          : "text-[#06B6D4]";
  return (
    <Card className="px-2 py-3 text-center shadow-none sm:px-3 sm:py-4">
      <p className={`text-xl font-bold tracking-tight sm:text-2xl ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] font-medium tracking-wide text-[#94A3B8] uppercase sm:text-xs">{label}</p>
    </Card>
  );
}
