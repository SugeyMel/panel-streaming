import { BarList } from "@/components/ui/BarList";
import { PageHeader } from "@/components/ui/PageHeader";
import { monthlySeries } from "@/data/mock";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Resúmenes visuales de ventas, costos y pedidos." />
      <div className="grid gap-6 lg:grid-cols-2">
        <BarList title="Ventas" items={monthlySeries.map((item) => ({ label: item.label, value: item.sales }))} />
        <BarList title="Pedidos" items={monthlySeries.map((item) => ({ label: item.label, value: item.orders }))} />
      </div>
    </div>
  );
}
