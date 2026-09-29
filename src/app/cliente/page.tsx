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
import { loadAdminWhatsapp } from "@/lib/seller-permissions";

export default async function CustomerHomePage() {
  const { customerId } = await customerScope();
  const [customer, services, orders, platforms, adminWhatsapp] = await Promise.all([
    loadCustomerById(customerId),
    loadServices({ customerId }),
    loadOrders({ customerId }),
    loadPlatforms(),
    loadAdminWhatsapp().catch(() => ""),
  ]);
  const seller = await loadSellerById(customer?.sellerId ?? null);
  const store = seller ? await loadStorefront(seller.slug) : null;

  return (
    <CustomerHomeDashboard
      customerName={customer?.name?.trim() || "cliente"}
      sellerName={seller?.businessName || seller?.name || "tu vendedor"}
      sellerWhatsapp={seller?.whatsapp ?? ""}
      adminWhatsapp={adminWhatsapp}
      services={services.map((item) => ({ ...item, internalCost: 0 }))}
      orders={orders.map((item) => ({ ...item, internalCost: 0 }))}
      platforms={platforms}
      products={store?.products ?? []}
    />
  );
}
