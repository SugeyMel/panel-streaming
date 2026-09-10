import { OrdersBrowser } from "@/components/orders/OrdersBrowser";
import { loadOrders, panelScope } from "@/lib/data/queries";

export default async function SellerOrdersPage() {
  const { sellerId } = await panelScope();
  const list = await loadOrders({ sellerId });
  return (
    <OrdersBrowser
      orders={list}
      actionHref="/panel/pedidos/{id}"
      createHref="/panel/productos"
    />
  );
}
