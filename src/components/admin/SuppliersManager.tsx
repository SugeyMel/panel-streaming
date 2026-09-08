"use client";

import { upsertSupplierForm } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import type { Supplier } from "@/lib/types";

export function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
