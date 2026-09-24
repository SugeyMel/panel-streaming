"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppBrand } from "@/components/brand/Logo";
import { BottomNav } from "@/components/layout/BottomNav";
import { AlertsBell, SellerBell, type HeaderAlert, type SellerBellAlert } from "@/components/layout/SellerBell";
import { CustomerUserMenu } from "@/components/layout/CustomerUserMenu";
import { SellerUserMenu } from "@/components/layout/SellerUserMenu";
import { adminNav, customerNav, sellerNav, sellerPrimaryNav } from "@/components/layout/nav";
import { BellIcon, ChevronDownIcon, SearchIcon, WhatsAppIcon } from "@/components/icons";
import { signOutAction } from "@/app/actions/business";
import { DEFAULT_SUPPORT_HOURS } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

const homes = {
  admin: "/admin",
  seller: "/panel",
  customer: "/cliente",
};

const bellHref = {
  admin: "/admin/solicitudes",
  seller: "/panel/pedidos",
  customer: "/cliente/pedidos",
};

const sellerMoreItems: {
  label: string;
  href?: string;
  hint?: string;
  disabled?: boolean;
}[] = [
  { label: "Mis cuentas", href: "/panel/cuentas" },
  { label: "Inventario", href: "/panel/inventario" },
  { label: "Mi Bot", href: "/panel/correos" },
  { label: "Medios de pago", href: "/panel/configuracion" },
  { label: "Finanzas", href: "/panel/finanzas" },
  { label: "Reportes", disabled: true, hint: "Sin sección propia aún" },
  { label: "Configuración", href: "/panel/configuracion" },
  { label: "Soporte", href: "/panel/soporte" },
];

const adminMoreItems: { label: string; href: string }[] = [{ label: "Finanzas", href: "/admin/finanzas" }];

export function DashboardShell({
  title,
  role,
  variant,
  userName = "",
  userEmail = "",
  pendingAlerts = [],
  customerAlerts = [],
  brandLogoUrl,
  brandTitle,
  supportWhatsapp,
  supportHours,
  supportName,
  children,
}: {
  title: string;
  role: string;
  variant: "seller" | "admin" | "customer";
  userName?: string;
  userEmail?: string;
  pendingCount?: number;
  pendingAlerts?: SellerBellAlert[];
  customerAlerts?: HeaderAlert[];
  brandLogoUrl?: string | null;
  brandTitle?: string;
  supportWhatsapp?: string | null;
  supportHours?: string | null;
  supportName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [desktopMore, setDesktopMore] = useState(false);
  const desktopMoreRef = useRef<HTMLDivElement>(null);
  const items =
    variant === "admin" ? adminNav : variant === "customer" ? customerNav : sellerNav;
  const home = homes[variant];
  const customerSubflow =
    variant === "customer" &&
    (pathname.includes("/cliente/servicios/") || pathname.includes("/cliente/renovar"));
  const sellerApp = variant === "seller";
  const adminApp = variant === "admin";
  const customerApp = variant === "customer";
  const customerHome = customerApp && pathname === "/cliente";
  const customerServices = customerApp && pathname === "/cliente/servicios";
  const customerAccess = customerApp && pathname === "/cliente/acceso";
  const supportWa =
    customerApp && supportWhatsapp
      ? waLink(supportWhatsapp, `Hola ${supportName || "vendedor"}, soy ${userName || "cliente"}. Necesito ayuda.`)
      : "";
  const sellerMoreActive =
    sellerApp &&
    !sellerPrimaryNav.some((item) =>
      item.href === home ? pathname === item.href : pathname.startsWith(item.href),
    );
  const adminFinanceActive = adminApp && pathname.startsWith("/admin/finanzas");
  const sellerLight = sellerApp && (pathname === "/panel/clientes" || pathname === "/panel/vendedores");

  useEffect(() => {
    if (!sellerLight) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = "#F4F7FB";
    body.style.background = "#F4F7FB";
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, [sellerLight]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!desktopMoreRef.current?.contains(event.target as Node)) setDesktopMore(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div className={`min-h-screen ${
      sellerLight
        ? "bg-[#F4F7FB] text-[#0F172A]"
        : `text-[#F8FAFC] ${adminApp ? "bg-[#0B0F1A]" : customerApp ? "bg-[#0B0F19]" : "bg-[#070B12]"}`
    }`}>
      <div className={sellerApp ? "" : "lg:grid lg:grid-cols-[272px_1fr]"}>
        {sellerApp ? null : (
        <aside className="hidden min-h-screen flex-col border-r border-[#253047] bg-[#0B0F1A] lg:flex">
          <div className="border-b border-[#253047] p-4">
            <AppBrand href={home} role={role} size="sidebar" logoSrc={brandLogoUrl} title={brandTitle} />
            {customerApp ? <p className="mt-1 text-[11px] text-[#94A3B8]">Tu contenido, siempre contigo</p> : null}
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
                  prefetch={false}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? adminApp
                        ? "bg-[#7C3AED] text-white"
                        : customerApp
                          ? "bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]"
                          : "bg-gradient-to-r from-[#8B5CF6]/30 to-[#06B6D4]/15 text-[#F8FAFC] shadow-[inset_3px_0_0_#8B5CF6]"
                      : "text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {adminApp ? (
            <div className="mx-3 mb-3 rounded-2xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#2E1064]/80 to-[#111827] p-4">
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#7C3AED] text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M4 16 6 7l5 5 3-7 6 9v3H4z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">Panel Streaming Admin</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Tu negocio, en todas partes.</p>
            </div>
          ) : null}
          {customerApp && supportWa ? (
            <div className="mx-3 mb-3 rounded-2xl border border-[#22C55E]/25 bg-[#111827] p-3">
              <p className="text-xs font-semibold text-white">¿Necesitas ayuda?</p>
              <a
                href={supportWa}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#22C55E] text-xs font-semibold text-white"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <p className="mt-1.5 text-center text-[10px] text-[#64748B]">
                {supportHours?.trim() || DEFAULT_SUPPORT_HOURS}
              </p>
            </div>
          ) : null}
          <form action={signOutAction} className="p-4 pt-0">
            <button
              type="submit"
              className="w-full rounded-xl border border-[#253047] px-3 py-2.5 text-left text-sm text-[#94A3B8] hover:bg-[#172033] hover:text-white"
            >
              Cerrar sesión
            </button>
          </form>
        </aside>
        )}

        <div className="min-h-screen">
          <header
            className={`sticky top-0 z-20 border-b backdrop-blur-xl ${
              sellerLight
                ? "border-[#E2E8F0] bg-[#F4F7FB]/95"
                : `border-[#253047] ${adminApp ? "bg-[#0B0F1A]/92" : customerApp ? "bg-[#0B0F19]/92" : "bg-[#070B12]/92"}`
            } ${customerSubflow ? "hidden lg:block" : ""}`}
          >
            <div className={adminApp || sellerLight ? "hidden" : "hidden h-1 bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#06B6D4] lg:block"} />
            <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-5 lg:py-2.5">
              <div className={`flex min-w-0 items-center gap-6 ${sellerApp ? "" : "lg:hidden"}`}>
                <span className="inline-flex min-w-0 items-center gap-2">
                  <AppBrand compact href={home} logoSrc={brandLogoUrl} title={brandTitle} tone={sellerLight ? "light" : "dark"} />
                  {variant === "admin" ? (
                    <span className="shrink-0 rounded-full bg-[#1D4ED8]/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#93C5FD]">
                      Admin
                    </span>
                  ) : null}
                </span>
                {sellerApp ? (
                  <nav className="hidden min-w-0 items-center gap-1 lg:flex">
                    {sellerPrimaryNav.map((item) => {
                      const active =
                        item.href === home ? pathname === item.href : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ${
                            sellerLight
                              ? active
                                ? "bg-white text-[#0F172A] shadow-sm"
                                : "text-[#64748B] hover:text-[#0F172A]"
                              : active
                                ? "bg-[#172033] text-[#F8FAFC]"
                                : "text-[#94A3B8] hover:text-[#F8FAFC]"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </div>
              {sellerApp ? null : adminApp ? (
                <div className="hidden min-w-0 flex-1 lg:block">
                  <label className="relative mx-auto block max-w-xl">
                    <span className="sr-only">Buscar en el panel</span>
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                    <input
                      type="search"
                      placeholder="Buscar en el panel..."
                      className="h-10 w-full rounded-xl border border-[#253047] bg-[#111827] pr-3 pl-10 text-sm text-[#F1F5F9] outline-none placeholder:text-[#64748B]"
                    />
                  </label>
                </div>
              ) : customerApp ? (
                <form action="/cliente/comprar" className="relative hidden min-w-0 flex-1 lg:block">
                  <span className="sr-only">Buscar plataformas, pedidos o ayuda</span>
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                  <input
                    name="q"
                    type="search"
                    placeholder="Buscar plataformas, pedidos o ayuda..."
                    className="h-10 w-full rounded-xl border border-[#253047] bg-[#111827] pr-3 pl-10 text-sm text-[#F1F5F9] outline-none placeholder:text-[#64748B]"
                  />
                </form>
              ) : (
                <div className="hidden lg:block">
                  <h1 className="text-lg font-semibold">{title}</h1>
                </div>
              )}
              <div className="flex items-center gap-2">
                {sellerApp || adminApp ? (
                  <div ref={desktopMoreRef} className="relative hidden lg:block">
                    <button
                      type="button"
                      className={`inline-flex h-10 items-center gap-1 rounded-full border px-3 text-sm font-medium ${
                        (sellerApp && (sellerMoreActive || desktopMore)) ||
                        (adminApp && (adminFinanceActive || desktopMore))
                          ? sellerLight
                            ? "border-[#CBD5E1] bg-white text-[#0F172A] shadow-sm"
                            : "border-[#8B5CF6] bg-[#172033] text-[#F8FAFC]"
                          : sellerLight
                            ? "border-[#E2E8F0] bg-white text-[#0F172A]"
                            : "border-[#253047] bg-[#111827] text-[#F8FAFC]"
                      }`}
                      aria-expanded={desktopMore}
                      onClick={() => setDesktopMore((value) => !value)}
                    >
                      Más
                      <ChevronDownIcon className="h-4 w-4 text-[#94A3B8]" />
                    </button>
                    {desktopMore ? (
                      <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-[#253047] bg-[#111827] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                        {(sellerApp ? sellerMoreItems : adminMoreItems).map((item) =>
                          "disabled" in item && (item.disabled || !item.href) ? (
                            <div key={item.label} className="px-3 py-2.5 opacity-50">
                              <p className="text-sm text-[#94A3B8]">{item.label}</p>
                              {"hint" in item && item.hint ? <p className="text-xs text-[#64748B]">{item.hint}</p> : null}
                            </div>
                          ) : (
                            <Link
                              key={item.label}
                              href={item.href!}
                              onClick={() => setDesktopMore(false)}
                              className="block px-3 py-2.5 text-sm text-[#F8FAFC] hover:bg-[#172033]"
                            >
                              {item.label}
                            </Link>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {sellerApp ? (
                  <>
                    <Link
                      href="/panel/productos"
                      title="Productos en oferta"
                      aria-label="Productos en oferta"
                      className="grid shrink-0 place-items-center hover:brightness-[1.06] max-lg:h-[30px] max-lg:min-h-[30px] max-lg:w-[30px] max-lg:min-w-[30px] lg:h-[36px] lg:min-h-[36px] lg:w-[36px] lg:min-w-[36px]"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        aspectRatio: "1",
                        borderRadius: 9999,
                        background: "rgba(251,146,60,0.12)",
                        border: "1px solid rgba(251,146,60,0.35)",
                      }}
                    >
                      <span className="text-[14px] lg:text-[16px]" style={{ lineHeight: 1 }}>
                        🔥
                      </span>
                    </Link>
                    <SellerBell alerts={pendingAlerts} tone={sellerLight ? "light" : "dark"} />
                  </>
                ) : variant === "customer" ? (
                  <AlertsBell
                    alerts={customerAlerts}
                    footerHref="/cliente/pedidos"
                    footerLabel="Ver mis pedidos"
                    empty="No hay servicios entregados recientes."
                    wiggle
                  />
                ) : (
                  <>
                    {adminApp ? (
                      <a
                        href="#buscar"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#253047] bg-[#111827] text-[#94A3B8] lg:hidden"
                        aria-label="Buscar"
                      >
                        <SearchIcon className="h-5 w-5" />
                      </a>
                    ) : null}
                    <Link
                      href={bellHref[variant]}
                      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#253047] bg-[#111827] text-[#94A3B8]"
                      aria-label="Avisos"
                    >
                      <BellIcon className="h-5 w-5" />
                    </Link>
                  </>
                )}
                {variant === "seller" ? (
                  <SellerUserMenu name={userName} email={userEmail} roleLabel="Vendedor" />
                ) : adminApp ? (
                  <div className="flex items-center gap-3">
                    <SellerUserMenu name={userName} email={userEmail} roleLabel="Administrador" />
                    <span className="hidden leading-tight lg:block">
                      <span className="block text-sm font-semibold text-white">{userName || "Admin"}</span>
                      <span className="block text-[11px] text-[#94A3B8]">Administrador</span>
                    </span>
                  </div>
                ) : (
                  <CustomerUserMenu name={userName} email={userEmail} />
                )}
              </div>
            </div>
          </header>
          <main
            className={
              adminApp
                ? "px-3 py-3 pb-24 sm:px-4 lg:px-6 lg:py-3 lg:pb-4"
                : sellerApp && (pathname === "/panel/clientes" || pathname === "/panel/vendedores")
                  ? "bg-[#F4F7FB] px-3 py-3 pb-24 sm:px-6 lg:px-8 lg:py-6 lg:pb-8"
                : sellerApp && pathname === "/panel/pedidos"
                  ? "px-3 py-3 pb-24 sm:px-6 lg:px-8 lg:py-6 lg:pb-8"
                  : customerApp
                    ? customerHome || customerServices || customerAccess
                      ? "px-3 py-3 pb-24 lg:px-4 lg:py-3 lg:pb-5"
                      : "px-3 py-3 pb-24 sm:px-4 lg:px-5 lg:py-4 lg:pb-6"
                    : "px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-6 lg:pb-8"
            }
          >
            {children}
          </main>
        </div>
      </div>
      <BottomNav variant={variant} onMore={() => setMore(true)} moreOpen={more} />
      {more ? (
        <Sheet title="Más" onClose={() => setMore(false)}>
          {variant === "seller" ? (
            sellerMoreItems.map((item) =>
              item.disabled || !item.href ? (
                <div
                  key={item.label}
                  className="flex min-h-12 flex-col justify-center rounded-xl px-3 py-2 opacity-50"
                >
                  <span className="text-sm text-[#94A3B8]">{item.label}</span>
                  {item.hint ? <span className="text-xs text-[#64748B]">{item.hint}</span> : null}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMore(false)}
                  className="flex min-h-12 items-center rounded-xl px-3 text-sm text-[#F8FAFC] hover:bg-[#172033]"
                >
                  {item.label}
                </Link>
              ),
            )
          ) : (
            <>
              {adminApp
                ? adminMoreItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMore(false)}
                      className="flex min-h-12 items-center rounded-xl px-3 text-sm text-[#F8FAFC] hover:bg-[#172033]"
                    >
                      {item.label}
                    </Link>
                  ))
                : null}
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
            </>
          )}
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
