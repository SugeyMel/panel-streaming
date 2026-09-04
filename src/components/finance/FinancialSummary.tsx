import { Card, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import type { FinancialSummary } from "@/lib/types";

export function FinancialSummaryCards({
  summary,
  title = "Resumen financiero",
}: {
  summary: FinancialSummary;
  title?: string;
}) {
  const items = [
    { label: "Ingresos", value: formatCurrency(summary.sales) },
    { label: "Costos", value: formatCurrency(summary.costs) },
    { label: "Ganancia", value: formatCurrency(summary.profit) },
    { label: "Pedidos pagados", value: String(summary.paidOrders) },
    { label: "Ticket promedio", value: formatCurrency(summary.averageTicket) },
  ];

  return (
    <Card>
      <CardHeader title={title} />
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
