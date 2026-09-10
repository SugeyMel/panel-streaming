import { CustomerHomeDashboard } from "@/components/cliente/CustomerHomeDashboard";
import {
  customerScope,
  loadCustomerById,
  loadOrders,
  loadPlatforms,
  loadSellerById,
  loadServices,
  loadStorefront,
} from "@/lib/data/queries";

export default async function CustomerHomePage() {
  const { customerId } = await customerScope();
  const [customer, services, orders, platforms] = await Promise.all([
    loadCustomerById(customerId),
    loadServices({ customerId }),
    loadOrders({ customerId }),
    loadPlatforms(),
  ]);
  const seller = await loadSellerById(customer?.sellerId ?? null);
  const store = seller ? await loadStorefront(seller.slug) : null;

  return (
    <CustomerHomeDashboard
      customerName={customer?.name?.trim() || "cliente"}
      sellerName={seller?.businessName || seller?.name || "tu vendedor"}
      sellerWhatsapp={seller?.whatsapp ?? ""}
      services={services.map((item) => ({ ...item, internalCost: 0 }))}
      orders={orders.map((item) => ({ ...item, internalCost: 0 }))}
      platforms={platforms}
      products={store?.products ?? []}
    />
  );
}
