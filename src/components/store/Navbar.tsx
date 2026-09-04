"use client";

import Link from "next/link";
import { useState } from "react";
import { AppBrand } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/app/actions/business";
import { CloseIcon, MenuIcon } from "@/components/icons";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/#plataformas", label: "Plataformas" },
  { href: "/#como-comprar", label: "Cómo comprar" },
  { href: "/pedido", label: "Mis pedidos" },
];

export function Navbar({
  loggedIn = false,
  portalHref = "/login",
}: {
  loggedIn?: boolean;
  portalHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#253047] bg-[#070B12]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <AppBrand />
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#94A3B8] transition hover:text-[#F8FAFC]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
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
        <button
          type="button"
          className="rounded-lg p-2 text-[#F8FAFC] md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-[#253047] bg-[#0B111C] px-4 py-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC]"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {loggedIn ? (
            <>
              <Button href={portalHref} className="w-full">
                Mi panel
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" className="w-full">
                  Cerrar sesión
                </Button>
              </form>
            </>
          ) : (
            <Button href="/login" className="w-full">
              Iniciar sesión
            </Button>
          )}
        </div>
      ) : null}
    </header>
  );
}
