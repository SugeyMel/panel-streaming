import { BarList } from "@/components/ui/BarList";
import { Card, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SellerStatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { adminKpis, monthlySeries, orders, sellers } from "@/data/mock";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
import { sellerOrders, sellerSubscriptions, summarizeOrders } from "@/lib/selectors";

export default function AdminDashboardPage() {
  const sellerRows = sellers.map((seller) => {
    const summary = summarizeOrders(sellerOrders(seller.id));
    return {
      ...seller,
      customers: sellerSubscriptions(seller.id).length,
      sales: summary.sales,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visión global de vendedores, clientes, pedidos y rentabilidad."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas del mes" value={formatCurrency(adminKpis.sales)} hint="Operación global" />
        <MetricCard label="Ganancia neta" value={formatCurrency(adminKpis.profit)} />
        <MetricCard label="Servicios activos" value={String(adminKpis.activeServices)} />
        <MetricCard label="Por vencer" value={String(adminKpis.expiringServices)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BarList
          title="Ventas vs costos"
          items={monthlySeries.map((item) => ({ label: item.label, value: item.sales }))}
        />
        <BarList
          title="Costos mensuales"
          items={monthlySeries.map((item) => ({ label: item.label, value: item.costs }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Vendedores destacados" />
          <DataTable
            rows={sellerRows}
            columns={[
              { key: "name", header: "Vendedor", render: (row) => row.name },
              { key: "sales", header: "Ventas", render: (row) => formatCurrency(row.sales) },
              {
                key: "status",
                header: "Estado",
                render: (row) => <SellerStatusBadge status={row.status} />,
              },
            ]}
          />
        </Card>
        <BarList
          title="Servicios por plataforma"
          items={[
            { label: <PlatformName platform="netflix" size="table" />, value: 86 },
            { label: <PlatformName platform="disney-premium" size="table" />, value: 64 },
            { label: <PlatformName platform="max" size="table" />, value: 51 },
            { label: <PlatformName platform="prime" size="table" />, value: 47 },
          ]}
        />
      </div>

      <Card>
        <CardHeader title="Actividad reciente" description="Movimiento de toda la plataforma." />
        <OrdersTable orders={orders} showSeller actionHref={() => `/admin/pedidos`} />
      </Card>
    </div>
  );
}
