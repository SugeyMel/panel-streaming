"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppBrand } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/app/actions/business";
import { BellIcon, ShoppingBagIcon, UsersIcon } from "@/components/icons";

export function Navbar({
  loggedIn = false,
  portalHref = "/login",
  userName = "",
}: {
  loggedIn?: boolean;
  portalHref?: string;
  userName?: string;
}) {
  const pathname = usePathname();
  const storefront = pathname.startsWith("/tienda/");
  const initial = (userName.trim()[0] || "C").toUpperCase();
  const accountHref = loggedIn ? portalHref : "/login";
  const ordersHref = loggedIn && portalHref.startsWith("/cliente") ? "/cliente/pedidos" : "/pedido";

  if (storefront) {
    return (
      <header className="sticky top-0 z-40 border-b border-[#253047] bg-[#0B0F1A]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <AppBrand compact href="/" />
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="#catalogo"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#F1F5F9] hover:bg-white/5"
              aria-label="Catálogo"
            >
              <ShoppingBagIcon className="h-5 w-5" />
            </Link>
            <Link
              href={ordersHref}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#F1F5F9] hover:bg-white/5"
              aria-label="Notificaciones y pedidos"
            >
              <BellIcon className="h-5 w-5" />
            </Link>
            <Link
              href={accountHref}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[13px] font-bold text-white"
              aria-label="Mi cuenta"
            >
              {loggedIn ? initial : <UsersIcon className="h-4 w-4" />}
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#253047] bg-[#070B12]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <AppBrand />
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <>
              <Button href={portalHref} variant="primary">
                Mi panel
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost">
                  Cerrar sesión
                </Button>
              </form>
            </>
          ) : (
            <Button href="/login">Iniciar sesión</Button>
          )}
        </div>
      </div>
    </header>
  );
}
