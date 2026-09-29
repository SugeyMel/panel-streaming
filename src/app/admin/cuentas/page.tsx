import { AdminAccountAssign } from "@/components/admin/AdminAccountAssign";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadAdminAssignedAccounts, loadCustomers, loadPlatforms, loadSellers } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminAssignedAccountsPage() {
  const [sellers, platforms, assigned] = await Promise.all([
    loadSellers(),
    loadPlatforms(),
    loadAdminAssignedAccounts(),
  ]);
  // Clientes directos (bajo "Venta directa") para poder elegir a quién se le da la cuenta.
  const directSeller = sellers.find((item) => item.slug === "venta-directa");
  const directCustomers = directSeller
    ? (await loadCustomers(directSeller.id).catch(() => [])).map((item) => ({ id: item.id, name: item.name }))
    : [];
  return (
    <div>
      <PageHeader title="Cuentas asignadas" description="Asigna cuentas concretas a tus vendedores." />
      <AdminAccountAssign
        sellers={sellers}
        platforms={platforms}
        assigned={assigned}
        directSellerId={directSeller?.id ?? null}
        directCustomers={directCustomers}
      />
    </div>
  );
}
