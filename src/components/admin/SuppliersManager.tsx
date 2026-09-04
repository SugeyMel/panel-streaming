"use client";

import { upsertSupplierForm, upsertSupplierProductForm } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/format";
import type { Platform } from "@/lib/types";

type Supplier = {
  id: string;
  name: string;
  contact?: string | null;
  status: string;
  notes?: string | null;
};

type SupplierProduct = {
  id: string;
  supplier_id: string;
  platform_id?: string | null;
  name: string;
  wholesale_price: number;
  status: string;
  notes?: string | null;
};

export function SuppliersManager({
  suppliers,
  products,
  platforms,
}: {
  suppliers: Supplier[];
  products: SupplierProduct[];
  platforms: Platform[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Proveedores" description="Catálogo mayorista. Sin pagos automáticos todavía." />
      <Card className="p-5">
        <form action={upsertSupplierForm} className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Nombre proveedor" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="contact" placeholder="Contacto" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <select name="status" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <input name="notes" placeholder="Notas" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <Button type="submit">Crear proveedor</Button>
        </form>
      </Card>
      <Card>
        <DataTable
          rows={suppliers}
          columns={[
            { key: "name", header: "Proveedor", render: (row) => row.name },
            { key: "contact", header: "Contacto", render: (row) => row.contact ?? "—" },
            { key: "status", header: "Estado", render: (row) => row.status },
            { key: "notes", header: "Notas", render: (row) => row.notes ?? "—" },
          ]}
        />
      </Card>
      <Card className="p-5">
        <form action={upsertSupplierProductForm} className="grid gap-3 sm:grid-cols-2">
          <select name="supplierId" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select name="platformId" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="">Plataforma</option>
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input name="name" placeholder="Producto mayorista" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="wholesalePrice" type="number" step="0.01" placeholder="Precio mayorista" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <Button type="submit">Registrar producto</Button>
        </form>
      </Card>
      <Card>
        <DataTable
          rows={products}
          columns={[
            { key: "name", header: "Producto", render: (row) => row.name },
            { key: "price", header: "Precio mayorista", render: (row) => formatCurrency(Number(row.wholesale_price)) },
            { key: "status", header: "Estado", render: (row) => row.status },
          ]}
        />
      </Card>
    </div>
  );
}
