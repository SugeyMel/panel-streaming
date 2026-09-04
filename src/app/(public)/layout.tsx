import type { ReactNode } from "react";
import { Footer } from "@/components/store/Footer";
import { Navbar } from "@/components/store/Navbar";
import { getAppSession, portalPath } from "@/lib/auth/get-session";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAppSession();
  const loggedIn = session.mode === "live" && Boolean(session.userId);

  return (
    <div className="flex min-h-full flex-col">
      <Navbar loggedIn={loggedIn} portalHref={portalPath(session.role)} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
