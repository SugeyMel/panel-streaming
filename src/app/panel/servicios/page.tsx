import { ServicesManager } from "@/components/services/ServicesManager";
import { loadCustomers, loadPlatforms, loadProducts, loadServices, panelScope } from "@/lib/data/queries";

export default async function SellerServicesPage() {
  const { sellerId } = await panelScope();
  const [services, platforms, products, customers] = await Promise.all([
    loadServices({ sellerId }),
    loadPlatforms(),
    loadProducts(sellerId),
    loadCustomers(sellerId),
  ]);
  return (
    <ServicesManager
      services={services}
      platforms={platforms}
      products={products}
      customers={customers}
      showInternal
    />
  );
}
