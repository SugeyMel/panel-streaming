import { CustomerOrdersBoard, type CustomerOrderCardData } from "@/components/orders/CustomerOrdersBoard";
import { customerScope, loadCustomerById, loadOrders, loadPlatforms, loadProducts, loadServices } from "@/lib/data/queries";
import { formatDateTime } from "@/lib/format";
import { parseProfileSlot } from "@/lib/inventory-matrix";
import { orderPlatformLabel } from "@/lib/platform-logos";

export default async function CustomerOrdersPage() {
  const { customerId } = await customerScope();
  const customer = await loadCustomerById(customerId);
  const [orders, platforms, services, products] = await Promise.all([
    loadOrders({ customerId }),
    loadPlatforms(),
    loadServices({ customerId }),
    loadProducts(customer?.sellerId, true),
  ]);

  const cards: CustomerOrderCardData[] = orders.map((order) => {
    const product = products.find((item) => item.id === order.productId);
    const platformId = order.platformId || product?.platformId || "";
    const platform = platforms.find((item) => item.id === platformId);
    const service = services.find((item) => item.orderId === order.id);
    const parsed = parseProfileSlot(service?.accessProfile);
    const profileLabel = parsed.name || (parsed.slot ? `Perfil ${parsed.slot}` : null);
    const planLabel =
      product?.name ||
      order.planName ||
      (product?.durationDays ? `${product.durationDays} días` : "Plan");

    return {
      id: order.id,
      code: order.code,
      status: order.status,
      amount: order.amount,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt ?? null,
      purchaseLabel: formatDateTime(order.createdAt),
      deliveredLabel: order.deliveredAt ? formatDateTime(order.deliveredAt) : null,
      platform: platform ?? order.platformName ?? platformId,
      platformName: orderPlatformLabel({ platformId, platformName: order.platformName }, platforms),
      planLabel,
      profileLabel,
    };
  });

  return <CustomerOrdersBoard orders={cards} />;
}
