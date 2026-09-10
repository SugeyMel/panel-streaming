"use client";

import { upsertSupplierForm } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import type { Supplier } from "@/lib/types";

const field =
  "min-w-0 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#64748B]";

export function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="space-y-4">
      <Card className="p-3 @lg:p-5">
        <form action={upsertSupplierForm} className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
          <input name="name" placeholder="Nombre proveedor" className={field} />
          <input name="contact" placeholder="Contacto" className={field} />
          <select name="status" className={field}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <input name="notes" placeholder="Notas" className={field} />
          <Button type="submit" className="col-span-full w-full @lg:w-auto @lg:justify-self-start">
            Crear proveedor
          </Button>
        </form>
      </Card>
      <Card>
        <DataTable
          rows={suppliers}
          empty="Aún no hay proveedores."
          mobileRender={(row) => (
            <article className="rounded-2xl border border-[#253047] bg-[#0B111C] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-[#F8FAFC]">{row.name}</p>
                <span className="shrink-0 text-[11px] font-semibold text-[#94A3B8]">
                  {row.status === "active" ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-[#94A3B8]">{row.contact || "Sin contacto"}</p>
              {row.notes ? <p className="mt-1 text-xs leading-snug break-words text-[#CBD5E1]">{row.notes}</p> : null}
            </article>
          )}
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
