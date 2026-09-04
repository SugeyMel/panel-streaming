import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { MetricCard } from "@/components/ui/MetricCard";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SellerStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { PaymentMethodsManager } from "@/components/payments/PaymentMethodsManager";
import {
  loadCustomerRows,
  loadFinance,
  loadOrders,
  loadPaymentMethods,
  loadSellers,
  loadServices,
} from "@/lib/data/queries";

export default async function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sellers = await loadSellers();
  const seller = sellers.find((item) => item.id === id);
  if (!seller) notFound();
  const [finance, orders, services, customers, methods] = await Promise.all([
    loadFinance(seller.id),
    loadOrders({ sellerId: seller.id }),
    loadServices({ sellerId: seller.id }),
    loadCustomerRows(seller.id),
    loadPaymentMethods(seller.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Vendedor: ${seller.name}`}
        description={`${seller.businessName} · ${seller.email}`}
        action={<SellerStatusBadge status={seller.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas" value={formatCurrency(finance.sales)} />
        <MetricCard label="Costos" value={formatCurrency(finance.costs)} />
        <MetricCard label="Ganancia neta" value={formatCurrency(finance.netProfit)} />
        <MetricCard label="Clientes" value={String(customers.length)} />
        <MetricCard label="Servicios activos" value={String(finance.activeServices)} />
        <MetricCard label="Pedidos pendientes" value={String(finance.pendingOrders)} />
      </div>
      <PaymentMethodsManager sellerId={seller.id} methods={methods} />
      <Card>
        <CardHeader title="Clientes" />
        <CustomerTable rows={customers} />
      </Card>
      <Card>
        <CardHeader title="Pedidos" />
        <OrdersTable orders={orders} />
      </Card>
      <p className="text-xs text-slate-500">{services.length} servicios registrados.</p>
    </div>
  );
}
