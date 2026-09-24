import { AdminAccountAssign } from "@/components/admin/AdminAccountAssign";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadAdminAssignedAccounts, loadPlatforms, loadSellers } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminAssignedAccountsPage() {
  const [sellers, platforms, assigned] = await Promise.all([
    loadSellers(),
    loadPlatforms(),
    loadAdminAssignedAccounts(),
  ]);
  return (
    <div>
      <PageHeader title="Cuentas asignadas" description="Asigna cuentas concretas a tus vendedores." />
      <AdminAccountAssign sellers={sellers} platforms={platforms} assigned={assigned} />
    </div>
  );
}
