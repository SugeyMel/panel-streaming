import { CustomersManager } from "@/components/customers/CustomersManager";
import { loadCustomerRows, loadCustomers, panelScope } from "@/lib/data/queries";
import type { CustomerRow } from "@/lib/selectors";

export default async function SellerCustomersPage() {
  const { sellerId } = await panelScope();
  let rows: CustomerRow[] = [];
  try {
    rows = await loadCustomerRows(sellerId);
  } catch {
    const customers = await loadCustomers(sellerId).catch(() => []);
    rows = customers.map((customer) => ({
      ...customer,
      activeServices: 0,
      expiredServices: 0,
      nextExpiry: null,
      totalPurchases: 0,
      lastPurchase: null,
    }));
  }
  return <CustomersManager rows={rows} detailBase="/panel/clientes" />;
}
