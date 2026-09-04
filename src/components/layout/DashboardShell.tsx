"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppBrand } from "@/components/brand/Logo";
import { BottomNav } from "@/components/layout/BottomNav";
import { adminNav, customerNav, sellerNav } from "@/components/layout/nav";
import { BellIcon } from "@/components/icons";
import { signOutAction } from "@/app/actions/business";

const homes = {
  admin: "/admin",
  seller: "/panel",
  customer: "/cliente",
};

const bellHref = {
  admin: "/admin/solicitudes",
  seller: "/panel/comprobantes",
  customer: "/cliente/pedidos",
};

const sellerQuick = [
  { href: "/panel/ventas", label: "Nueva venta" },
  { href: "/panel/clientes", label: "Nuevo cliente" },
  { href: "/panel/servicios", label: "Nuevo servicio" },
  { href: "/panel/finanzas", label: "Registrar gasto" },
];

export function DashboardShell({
  title,
  role,
  variant,
  userName = "",
  children,
}: {
  title: string;
  role: string;
  variant: "seller" | "admin" | "customer";
  userName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [plus, setPlus] = useState(false);
  const items =
    variant === "admin" ? adminNav : variant === "customer" ? customerNav : sellerNav;
  const home = homes[variant];
  const initial = (userName.trim()[0] ?? role[0] ?? "U").toUpperCase();
  const customerSubflow =
    variant === "customer" &&
    (pathname.includes("/cliente/servicios/") || pathname.includes("/cliente/renovar"));

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F8FAFC]">
      <div className="lg:grid lg:grid-cols-[272px_1fr]">
        <aside className="hidden min-h-screen flex-col border-r border-[#253047] bg-[#0B111C] lg:flex">
          <div className="border-b border-[#253047] bg-gradient-to-r from-[#8B5CF6]/20 via-transparent to-[#06B6D4]/10 p-5">
            <AppBrand href={home} role={role} size="sidebar" />
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {items.map((item) => {
              const active =
                item.href === home
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-[#8B5CF6]/30 to-[#06B6D4]/15 text-[#F8FAFC] shadow-[inset_3px_0_0_#8B5CF6]"
                      : "text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action={signOutAction} className="p-4">
            <button
              type="submit"
              className="w-full rounded-xl border border-[#253047] px-3 py-2.5 text-left text-sm text-[#94A3B8] hover:bg-[#172033] hover:text-white"
            >
              Cerrar sesión
            </button>
          </form>
        </aside>

        <div className="min-h-screen">
          <header
            className={`sticky top-0 z-20 border-b border-[#253047] bg-[#070B12]/92 backdrop-blur-xl ${
              customerSubflow ? "hidden lg:block" : ""
            }`}
          >
            <div className="hidden h-1 bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#06B6D4] lg:block" />
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <AppBrand compact href={home} />
              </div>
              <div className="hidden lg:block">
                <h1 className="text-lg font-semibold">{title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={bellHref[variant]}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#253047] bg-[#111827] text-[#94A3B8]"
                  aria-label="Avisos"
                >
                  <BellIcon className="h-5 w-5" />
                </Link>
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-sm font-semibold text-white"
                  title={userName || role}
                >
                  {initial}
                </span>
                <form action={signOutAction} className="hidden sm:block lg:block">
                  <button
                    type="submit"
                    className="hidden rounded-xl border border-[#253047] bg-[#0B111C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172033] lg:inline-flex"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          </header>
          <main className="px-4 py-5 pb-28 sm:px-6 lg:py-6 lg:pb-8">{children}</main>
        </div>
      </div>
      <BottomNav
        variant={variant}
        onMore={() => setMore(true)}
        onPlus={variant === "seller" ? () => setPlus(true) : undefined}
      />
      {more ? (
        <Sheet title="Más" onClose={() => setMore(false)}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMore(false)}
              className="flex min-h-12 items-center rounded-xl px-3 text-sm text-[#F8FAFC] hover:bg-[#172033]"
            >
              {item.label}
            </Link>
          ))}
          <form action={signOutAction}>
            <button type="submit" className="mt-2 w-full rounded-xl px-3 py-3 text-left text-sm text-[#EF4444]">
              Cerrar sesión
            </button>
          </form>
        </Sheet>
      ) : null}
      {plus ? (
        <Sheet title="Acciones rápidas" onClose={() => setPlus(false)}>
          {sellerQuick.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setPlus(false)}
              className="flex min-h-12 items-center rounded-xl px-3 text-sm text-[#F8FAFC] hover:bg-[#172033]"
            >
              {item.label}
            </Link>
          ))}
        </Sheet>
      ) : null}
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/55" aria-label="Cerrar" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-[#253047] bg-[#111827] p-4 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[#F8FAFC]">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-[#94A3B8]">
            Cerrar
          </button>
        </div>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}
