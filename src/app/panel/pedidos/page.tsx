import { Card } from "@/components/ui/Card";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadOrders, panelScope } from "@/lib/data/queries";

export default async function SellerOrdersPage() {
  const { sellerId } = await panelScope();
  const list = await loadOrders({ sellerId });
  return (
    <div>
      <PageHeader title="Pedidos" description="Solo los pedidos de tu negocio." />
      <Card>
        <OrdersTable orders={list} actionHref={(order) => `/panel/pedidos/${order.id}`} />
      </Card>
    </div>
  );
}
