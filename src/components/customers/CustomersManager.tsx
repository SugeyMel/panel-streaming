"use client";

import { useMemo, useState } from "react";
import { upsertCustomerAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { Filters } from "@/components/ui/Filters";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { waLink, supportMessage } from "@/lib/whatsapp";
import { whatsappParaMostrar } from "@/lib/clientes";
import type { CustomerRow } from "@/lib/selectors";
import type { Customer } from "@/lib/types";

const filters = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "por_vencer", label: "Próximos a vencer" },
  { value: "vencidos", label: "Vencidos" },
  { value: "sin_servicios", label: "Sin servicios" },
] as const;

export function CustomersManager({
  rows,
  detailBase,
}: {
  rows: CustomerRow[];
  detailBase: string;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("todos");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchQuery = `${row.name} ${whatsappParaMostrar(row.whatsapp)} ${row.whatsapp} ${row.email}`.toLowerCase().includes(query.toLowerCase());
      if (!matchQuery) return false;
      if (filter === "activos") return row.activeServices > 0;
      if (filter === "por_vencer") return Boolean(row.nextExpiry) && row.activeServices > 0;
      if (filter === "vencidos") return row.expiredServices > 0 && row.activeServices === 0;
      if (filter === "sin_servicios") return row.activeServices === 0 && row.expiredServices === 0;
      return true;
    });
  }, [filter, rows, query]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="El cliente entra con su celular y una clave. No necesita correo ni entrar a Supabase. No ve tus costos ni tu panel."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}>+ Crear cliente</Button>}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Filters value={filter} onChange={setFilter} options={[...filters]} />
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente" />
      </div>
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <CustomerTable
          rows={filtered}
          hrefFor={(row) => `${detailBase}/${row.id}`}
          onEdit={(row) => {
            setEditing(row);
            setOpen(true);
          }}
        />
      </Card>
      <Modal open={open} title={editing ? "Editar cliente" : "Crear cliente"} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            if (editing) formData.set("id", editing.id);
            const result = await upsertCustomerAction(formData);
            setMessage(result.ok ? "Guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) setOpen(false);
          }}
        >
          <input name="name" defaultValue={editing?.name} placeholder="Nombre" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <WhatsAppInput name="whatsapp" defaultValue={editing?.whatsapp} required />
          <input name="email" type="email" defaultValue={editing?.email} placeholder="Correo (opcional, solo contacto)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          {editing ? null : (
            <input
              name="password"
              type="password"
              placeholder="Clave del cliente (mín. 6)"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            />
          )}
          <select name="status" defaultValue={editing?.status ?? "activo"} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Modal>
      <p className="text-xs text-slate-500">
        WhatsApp de ejemplo:{" "}
        <a className="text-cyan-300" href={waLink("987654321", supportMessage("Carlos"))} target="_blank" rel="noreferrer">
          contactar
        </a>
      </p>
    </div>
  );
}
