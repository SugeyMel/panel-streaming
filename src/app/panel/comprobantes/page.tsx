import { Card } from "@/components/ui/Card";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadOrders, panelScope } from "@/lib/data/queries";

export default async function SellerReceiptsPage() {
  const { sellerId } = await panelScope();
  const pending = (await loadOrders({ sellerId })).filter((item) =>
    ["pendiente_pago", "pago_enviado"].includes(item.status),
  );
  return (
    <div>
      <PageHeader title="Comprobantes" description="Aquí te llegan los vouchers. Pulsa Ver, mira la foto y aprueba o rechaza." />
      <Card>
        <OrdersTable orders={pending} actionHref={(order) => `/panel/pedidos/${order.id}`} />
      </Card>
    </div>
  );
}
