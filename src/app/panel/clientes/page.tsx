import { CustomersManager } from "@/components/customers/CustomersManager";
import { loadCustomerRows, panelScope } from "@/lib/data/queries";

export default async function SellerCustomersPage() {
  const { sellerId } = await panelScope();
  const rows = await loadCustomerRows(sellerId);
  return <CustomersManager rows={rows} detailBase="/panel/clientes" />;
}
