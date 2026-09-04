import { ServicesManager } from "@/components/services/ServicesManager";
import { loadCustomers, loadPlatforms, loadProducts, loadServices } from "@/lib/data/queries";

export default async function AdminServicesPage() {
  const [services, platforms, products, customers] = await Promise.all([
    loadServices(),
    loadPlatforms(),
    loadProducts(),
    loadCustomers(),
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
