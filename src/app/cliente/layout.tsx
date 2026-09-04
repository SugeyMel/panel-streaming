import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAppSession } from "@/lib/auth/get-session";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getAppSession();
  return (
    <DashboardShell title="Inicio" role="Cliente" variant="customer" userName={session.name}>
      {children}
    </DashboardShell>
  );
}
