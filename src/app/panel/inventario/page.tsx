import { InventoryAccountsManager } from "@/components/inventory/InventoryAccountsManager";
import {
  loadCustomers,
  loadPlatforms,
  loadProducts,
  loadServices,
  loadStreamingAccounts,
  loadStoreOfferLinks,
  loadMessageTemplates,
  panelScope,
} from "@/lib/data/queries";

export default async function SellerInventoryPage() {
  const { sellerId } = await panelScope();
  const [products, platforms, accounts, services, customers, plantillas, offerLinks] = await Promise.all([
    loadProducts(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
    loadServices({ sellerId }),
    loadCustomers(sellerId),
    loadMessageTemplates(sellerId),
    loadStoreOfferLinks(sellerId),
  ]);
  return (
    <InventoryAccountsManager
      accounts={accounts}
      platforms={platforms}
      services={services}
      customers={customers}
      products={products}
      plantillas={plantillas}
      offerLinks={offerLinks}
    />
  );
}
