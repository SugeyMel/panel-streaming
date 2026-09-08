import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { loadOrders, panelScope } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function SellerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, sellerId } = await panelScope();
  const orders = await loadOrders({ sellerId });
  const pendingAlerts = orders
    .filter((item) => ["pendiente_pago", "pago_enviado"].includes(item.status))
    .map((item) => ({
      id: item.id,
      code: item.code,
      customerName: item.customerName,
      status: item.status,
    }));

  return (
    <DashboardShell
      title="Panel del vendedor"
      role="Vendedor"
      variant="seller"
      userName={session.name}
      pendingCount={pendingAlerts.length}
      pendingAlerts={pendingAlerts}
    >
      {children}
    </DashboardShell>
  );
}
