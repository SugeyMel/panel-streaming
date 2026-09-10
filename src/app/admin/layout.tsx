import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAppSession } from "@/lib/auth/get-session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAppSession();
  return (
    <DashboardShell title="Panel maestro" role="Admin" variant="admin" userName={session.name} userEmail={session.email}>
      {children}
    </DashboardShell>
  );
}
