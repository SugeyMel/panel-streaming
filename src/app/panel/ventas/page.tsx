import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
import { loadOrders, loadPlatforms, panelScope } from "@/lib/data/queries";

export default async function SellerSalesPage() {
  const { sellerId } = await panelScope();
  const [orders, platforms] = await Promise.all([loadOrders({ sellerId }), loadPlatforms()]);
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
    <div>
      <PageHeader title="Ventas" description="Unidades e ingresos calculados desde pedidos." />
      <Card>
        <DataTable
          rows={Object.values(grouped)}
          columns={[
            { key: "p", header: "Servicio", render: (row) => (
              <PlatformName platform={platforms.find((item) => item.id === row.id) ?? row.id} size="table" />
            ) },
            { key: "u", header: "Unidades vendidas", render: (row) => row.units },
            { key: "s", header: "Ingresos", render: (row) => formatCurrency(row.sales) },
            { key: "c", header: "Costos", render: (row) => formatCurrency(row.costs) },
            { key: "g", header: "Ganancia", render: (row) => formatCurrency(row.sales - row.costs) },
          ]}
        />
      </Card>
    </div>
  );
}
