import { AdminCustomersBoard } from "@/components/admin/AdminCustomersBoard";
import { loadCustomerRows, loadSellers } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [rows, sellers] = await Promise.all([loadCustomerRows(), loadSellers()]);
  return <AdminCustomersBoard rows={rows} sellers={sellers} />;
}
