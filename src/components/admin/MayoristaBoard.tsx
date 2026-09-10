"use client";

import Link from "next/link";
import { PlatformsManager } from "@/components/admin/PlatformsManager";
import { SuppliersManager } from "@/components/admin/SuppliersManager";
import { WholesaleCatalogTab } from "@/components/admin/WholesaleCatalogTab";
import type { Platform, Supplier, WholesaleCatalogProduct } from "@/lib/types";

const TABS = [
  { id: "catalogo", label: "Catálogo", href: "/admin/mayorista" },
  { id: "plataformas", label: "Plataformas", href: "/admin/mayorista?tab=plataformas" },
  { id: "proveedores", label: "Proveedores", href: "/admin/mayorista?tab=proveedores" },
] as const;

export type MayoristaTab = (typeof TABS)[number]["id"];

export function MayoristaBoard({
  tab,
  products,
  platforms,
  suppliers,
}: {
  tab: MayoristaTab;
  products: WholesaleCatalogProduct[];
  platforms: Platform[];
  suppliers: Supplier[];
}) {
  return (
    <div className="@container min-w-0 space-y-3 @lg:space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F8FAFC] @lg:text-3xl">Mayorista</h1>
        <p className="mt-1 text-[12px] leading-snug text-[#94A3B8] @lg:text-sm">
          Lo que ofreces a tus vendedores, las plataformas y a quién le compras.
        </p>
      </div>
      <nav className="grid grid-cols-3 gap-1 rounded-xl bg-[#0B111C] p-1 @lg:flex @lg:w-fit @lg:gap-2 @lg:bg-transparent @lg:p-0">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`rounded-lg px-2 py-2 text-center text-[11px] font-semibold @lg:rounded-xl @lg:px-3 @lg:text-sm ${
                active
                  ? "bg-[#7C3AED] text-white"
                  : "text-[#94A3B8] @lg:border @lg:border-[#253047] @lg:bg-[#111827] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {tab === "catalogo" ? (
        <WholesaleCatalogTab products={products} platforms={platforms} suppliers={suppliers} />
      ) : null}
      {tab === "plataformas" ? <PlatformsManager platforms={platforms} embedded /> : null}
      {tab === "proveedores" ? <SuppliersManager suppliers={suppliers} /> : null}
    </div>
  );
}
