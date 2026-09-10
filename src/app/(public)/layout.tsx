import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { getAppSession, portalPath } from "@/lib/auth/get-session";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAppSession();
  const loggedIn = session.mode === "live" && Boolean(session.userId);

  return (
    <PublicShell
      loggedIn={loggedIn}
      portalHref={portalPath(session.role)}
      userName={session.name}
    >
      {children}
    </PublicShell>
  );
}
