import type { ReactNode } from "react";
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
