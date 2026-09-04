import { createExpenseForm } from "@/app/actions/business";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FinancialSummaryCards } from "@/components/finance/FinancialSummary";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";
import { loadFinance, loadOrders, loadPlatforms, panelScope } from "@/lib/data/queries";

export default async function SellerFinancePage() {
  const { sellerId } = await panelScope();
  const [finance, orders, platforms] = await Promise.all([
    loadFinance(sellerId),
    loadOrders({ sellerId }),
    loadPlatforms(),
  ]);
  const grouped = orders.reduce<Record<string, { id: string; units: number; sales: number; costs: number }>>(
    (acc, order) => {
      const current = acc[order.platformId] ?? { id: order.platformId, units: 0, sales: 0, costs: 0 };
      current.units += 1;
      current.sales += order.amount;
      current.costs += order.internalCost;
      acc[order.platformId] = current;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Finanzas" description="Cálculo: ganancia bruta = ventas - costos. Neta = bruta - egresos." />
      <FinancialSummaryCards
        summary={{
          sales: finance.sales,
          costs: finance.costs,
          profit: finance.grossProfit,
          paidOrders: finance.paidOrders,
          averageTicket: finance.averageTicket,
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Egresos" value={formatCurrency(finance.expenses)} />
        <MetricCard label="Ganancia neta" value={formatCurrency(finance.netProfit)} />
        <MetricCard label="Pedidos pendientes" value={String(finance.pendingOrders)} />
        <MetricCard label="Servicios por vencer" value={String(finance.expiringServices)} />
      </div>
      <Card className="p-5">
        <form action={createExpenseForm} className="flex flex-col gap-3 sm:flex-row">
          <input name="amount" type="number" step="0.01" placeholder="Monto egreso" className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="description" placeholder="Descripción" className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <Button type="submit">Registrar egreso</Button>
        </form>
      </Card>
      <Card>
        <DataTable
          rows={Object.values(grouped)}
          columns={[
            { key: "s", header: "Servicio", render: (row) => (
              <PlatformName platform={platforms.find((item) => item.id === row.id) ?? row.id} size="table" />
            ) },
            { key: "u", header: "Unidades", render: (row) => row.units },
            { key: "i", header: "Ingresos", render: (row) => formatCurrency(row.sales) },
            { key: "c", header: "Costos", render: (row) => formatCurrency(row.costs) },
            { key: "g", header: "Ganancia", render: (row) => formatCurrency(row.sales - row.costs) },
          ]}
        />
      </Card>
    </div>
  );
}
