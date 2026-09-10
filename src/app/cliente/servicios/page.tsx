import { CustomerServicesBoard } from "@/components/cliente/CustomerServicesBoard";
import { customerScope, loadPlatforms, loadProducts, loadServices } from "@/lib/data/queries";

export default async function CustomerServicesPage() {
  const { customerId } = await customerScope();
  const [services, platforms] = await Promise.all([
    loadServices({ customerId }),
    loadPlatforms(),
  ]);
  const sellerIds = [...new Set(services.map((item) => item.sellerId))];
  const products = (
    await Promise.all(sellerIds.map((sellerId) => loadProducts(sellerId, true)))
  ).flat();

  return (
    <CustomerServicesBoard
      services={services.map((item) => ({ ...item, internalCost: 0 }))}
      platforms={platforms}
      products={products}
    />
  );
}
