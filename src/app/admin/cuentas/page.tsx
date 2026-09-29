import { syncDirectCustomerServicesAction } from "@/app/actions/business";
import { AdminAccountAssign } from "@/components/admin/AdminAccountAssign";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadAdminAssignedAccounts, loadCustomers, loadPlatforms, loadSellers } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminAssignedAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  // Pasa al panel del cliente las cuentas directas que aún no se ven ahí (ej. asignadas antes de este cambio).
  await syncDirectCustomerServicesAction().catch(() => null);
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
      <PageHeader
        title="Cuentas asignadas"
        description="Aquí gestionas las cuentas: asignar, editar, desactivar o eliminar, a vendedores o a tus clientes directos."
      />
      <AdminAccountAssign
        sellers={sellers}
        platforms={platforms}
        assigned={assigned}
        directSellerId={directSeller?.id ?? null}
        directCustomers={directCustomers}
        filterCustomerId={cliente ?? null}
      />
    </div>
  );
}
