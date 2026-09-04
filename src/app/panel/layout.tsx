import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAppSession } from "@/lib/auth/get-session";

export default async function SellerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAppSession();
  return (
    <DashboardShell title="Panel del vendedor" role="Vendedor" variant="seller" userName={session.name}>
      {children}
    </DashboardShell>
  );
}
