import { OrdersBrowser } from "@/components/orders/OrdersBrowser";
import { loadOrders } from "@/lib/data/queries";

export default async function AdminOrdersPage() {
  const orders = await loadOrders();
  return <OrdersBrowser orders={orders} showSeller />;
}
