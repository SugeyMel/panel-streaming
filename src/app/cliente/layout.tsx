import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/business";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { customerScope, loadCustomerById, loadOrders, loadPlatforms, loadSellerById } from "@/lib/data/queries";
import { formatDateTime } from "@/lib/format";
import { orderPlatformLabel } from "@/lib/platform-logos";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const { session, customerId } = await customerScope();
  const [orders, platforms, customer] = await Promise.all([
    loadOrders({ customerId }),
    loadPlatforms(),
    loadCustomerById(customerId),
  ]);
  const seller = await loadSellerById(customer?.sellerId ?? null);
  if (customer && customer.status !== "activo") {
    // Acceso pausado: no se muestra el panel del cliente.
    return (
      <div className="grid min-h-screen place-items-center bg-[#070B14] px-4 text-center">
        <div className="max-w-sm rounded-2xl border border-[#253047] bg-[#0B111C] p-6">
          <h1 className="text-xl font-bold text-white">Tu acceso está pausado</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Comunícate con {seller?.businessName || seller?.name || "tu vendedor"} para reactivarlo.
          </p>
          <form action={signOutAction} className="mt-5">
            <button type="submit" className="h-11 w-full rounded-xl border border-[#253047] text-sm font-semibold text-white">
              Salir
            </button>
          </form>
        </div>
      </div>
    );
  }
  const customerAlerts = orders
    .filter((item) => item.status === "entregado")
    .map((item) => {
      const platform = orderPlatformLabel(item, platforms);
      return {
        id: item.id,
        href: "/cliente/acceso",
        title: `${platform} · ${item.code}`,
        subtitle: item.deliveredAt
          ? `Entregado ${formatDateTime(item.deliveredAt)}`
          : item.deliveryNote || "Ya puedes ver el acceso",
      };
    });

  return (
    <DashboardShell
      title="Inicio"
      role="Cliente"
      variant="customer"
      userName={customer?.name || session.name}
      userEmail={customer?.email || session.email}
      customerAlerts={customerAlerts}
      brandLogoUrl={seller?.logoUrl}
      brandTitle={seller?.businessName}
      supportWhatsapp={seller?.whatsapp}
      supportHours={seller?.supportHours}
      supportName={seller?.businessName || seller?.name || "tu vendedor"}
    >
      {children}
    </DashboardShell>
  );
}
