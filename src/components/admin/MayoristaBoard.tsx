"use client";

import Link from "next/link";
import { PlatformsManager } from "@/components/admin/PlatformsManager";
import { SuppliersManager } from "@/components/admin/SuppliersManager";
import { WholesaleCatalogTab } from "@/components/admin/WholesaleCatalogTab";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div className="space-y-4">
      <PageHeader title="Mayorista" description="Lo que ofreces a tus vendedores, las plataformas y a quién le compras." />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                active ? "bg-[#7C3AED] text-white" : "border border-[#253047] bg-[#111827] text-[#94A3B8] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {tab === "catalogo" ? (
        <WholesaleCatalogTab products={products} platforms={platforms} suppliers={suppliers} />
      ) : null}
      {tab === "plataformas" ? <PlatformsManager platforms={platforms} embedded /> : null}
      {tab === "proveedores" ? <SuppliersManager suppliers={suppliers} /> : null}
    </div>
  );
}
