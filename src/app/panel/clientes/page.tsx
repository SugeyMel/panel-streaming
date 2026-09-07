import { CustomersAccountsBoard } from "@/components/customers/CustomersAccountsBoard";
import {
  loadCustomers,
  loadPlatforms,
  loadProducts,
  loadServices,
  loadStreamingAccounts,
  panelScope,
} from "@/lib/data/queries";

export default async function SellerCustomersPage() {
  const { sellerId } = await panelScope();
  const [products, platforms, accounts, services, customers] = await Promise.all([
    loadProducts(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
    loadServices({ sellerId }),
    loadCustomers(sellerId),
  ]);
  return (
    <CustomersAccountsBoard
      accounts={accounts}
      platforms={platforms}
      services={services}
      customers={customers}
      products={products}
    />
  );
}
