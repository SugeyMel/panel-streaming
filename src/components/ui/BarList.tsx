import { Card } from "@/components/ui/Card";
import type { ReactNode } from "react";

export function BarList({
  items,
  title,
}: {
  title: string;
  items: { label: ReactNode; value: number }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="p-5">
      <h3 className="mb-5 font-semibold text-white">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index}>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-[#0B111C]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#38BDF8] to-[#06B6D4]"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
