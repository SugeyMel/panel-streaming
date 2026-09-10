"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/store/Footer";
import { Navbar } from "@/components/store/Navbar";

export function PublicShell({
  children,
  loggedIn,
  portalHref,
  userName,
}: {
  children: ReactNode;
  loggedIn: boolean;
  portalHref: string;
  userName: string;
}) {
  const pathname = usePathname();
  const access = pathname === "/" || pathname === "/login";

  if (access) return children;

  return (
    <div className="flex min-h-full flex-col">
      <Navbar loggedIn={loggedIn} portalHref={portalHref} userName={userName} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
