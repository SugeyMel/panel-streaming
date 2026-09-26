"use client";

import { DataTable } from "@/components/ui/DataTable";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
import type { Platform, Product } from "@/lib/types";

/** Tabla de Inventario del administrador (DataTable funciona en el navegador, por eso va aparte). */
export function AdminInventoryTable({
  products,
  sellers,
  platforms,
}: {
  products: Product[];
  sellers: { id: string; name: string }[];
  platforms: Platform[];
}) {
  return (
    <DataTable
      rows={products}
      columns={[
        { key: "seller", header: "Vendedor", render: (row) => sellers.find((item) => item.id === row.sellerId)?.name ?? "—" },
        {
          key: "platform",
          header: "Plataforma",
          render: (row) => (
            <PlatformName platform={platforms.find((item) => item.id === row.platformId) ?? row.platformId} size="table" />
          ),
        },
        { key: "name", header: "Producto", render: (row) => row.name },
        { key: "stock", header: "Stock", render: (row) => row.stock },
        { key: "price", header: "Precio", render: (row) => formatCurrency(row.salePrice) },
        { key: "status", header: "Estado", render: (row) => (row.soldOut ? "Agotado" : "Disponible") },
      ]}
    />
  );
}
