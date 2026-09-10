import { AdminIncomePanels } from "@/components/admin/AdminIncomePanels";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FinancialSummaryCards } from "@/components/finance/FinancialSummary";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { currentLimaMonthKey, monthOptions, wholesaleIncomeFromSales } from "@/lib/admin-home";
import { formatCurrency } from "@/lib/format";
import { loadFinance, loadOrders, loadSellers, loadWholesaleSales } from "@/lib/data/queries";
import { summarizeOrders } from "@/lib/selectors";

export default async function AdminFinancePage() {
  const [finance, sellers, orders, wholesaleSales] = await Promise.all([
    loadFinance(),
    loadSellers(),
    loadOrders(),
    loadWholesaleSales(),
  ]);
  const rows = sellers.map((seller) => ({
    ...seller,
    ...summarizeOrders(orders.filter((item) => item.sellerId === seller.id)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description="Tu negocio (alquiler y mayoreo) va aparte de los pedidos de las tiendas de vendedores."
      />
      <AdminIncomePanels
        months={monthOptions(12)}
        defaultMonth={currentLimaMonthKey()}
        wholesaleSales={wholesaleIncomeFromSales(wholesaleSales, sellers)}
      />
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white lg:text-base">Tiendas de vendedores</h2>
        <FinancialSummaryCards
          title="Pedidos de las tiendas"
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
          <MetricCard label="Servicios activos" value={String(finance.activeServices)} />
        </div>
        <Card>
          <DataTable
            rows={rows}
            columns={[
              { key: "name", header: "Vendedor", render: (row) => row.name },
              { key: "sales", header: "Ventas", render: (row) => formatCurrency(row.sales) },
              { key: "costs", header: "Costos", render: (row) => formatCurrency(row.costs) },
              { key: "profit", header: "Ganancia", render: (row) => formatCurrency(row.profit) },
              { key: "orders", header: "Pedidos", render: (row) => row.paidOrders },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
