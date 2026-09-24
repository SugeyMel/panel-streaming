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
import { loadAdminWhatsapp, sellerCanCreateCustomers } from "@/lib/seller-permissions";

export default async function SellerInventoryPage() {
  const { sellerId } = await panelScope();
  const canCreateCustomers = await sellerCanCreateCustomers(sellerId);
  const adminWhatsapp = await loadAdminWhatsapp();
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
      canCreateCustomers={canCreateCustomers}
      adminWhatsapp={adminWhatsapp}
      offerLinks={offerLinks}
    />
  );
}
