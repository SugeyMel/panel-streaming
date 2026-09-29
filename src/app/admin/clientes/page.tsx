import { AdminCustomersBoard } from "@/components/admin/AdminCustomersBoard";
import { loadCustomerRows, loadPlatforms, loadSellers, loadServices } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [rows, sellers, services, platforms] = await Promise.all([
    loadCustomerRows(),
    loadSellers(),
    loadServices().catch(() => []),
    loadPlatforms().catch(() => []),
  ]);
  return <AdminCustomersBoard rows={rows} sellers={sellers} services={services} platforms={platforms} />;
}
