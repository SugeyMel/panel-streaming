"use client";

import { useMemo, useState } from "react";
import { setSellerStatusAction, upsertSellerAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal, ConfirmationDialog } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { SellerStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Seller, SellerStatus } from "@/lib/types";

export function SellersManager({ sellers }: { sellers: Seller[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [confirm, setConfirm] = useState<Seller | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      sellers.filter((seller) =>
        `${seller.name} ${seller.businessName} ${seller.whatsapp} ${seller.slug}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [sellers, query],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendedores"
        description="Alta, edición y estado. En live, RLS limita esto a superadmin."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}>Crear vendedor</Button>}
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar vendedor" />
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <DataTable
          rows={rows}
          columns={[
            { key: "name", header: "Nombre", render: (row) => row.name },
            { key: "business", header: "Nombre del negocio", render: (row) => row.businessName },
            { key: "whatsapp", header: "WhatsApp", render: (row) => row.whatsapp },
            { key: "status", header: "Estado", render: (row) => <SellerStatusBadge status={row.status} /> },
            { key: "date", header: "Fecha de registro", render: (row) => formatDate(row.registeredAt) },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="flex gap-2">
                  <Button href={`/admin/vendedores/${row.id}`} variant="ghost" className="h-8 px-3 py-1 text-xs">Ver</Button>
                  <Button variant="ghost" className="h-8 px-3 py-1 text-xs" onClick={() => { setEditing(row); setOpen(true); }}>Editar</Button>
                  <Button variant="ghost" className="h-8 px-3 py-1 text-xs" onClick={() => setConfirm(row)}>
                    {row.status === "activo" ? "Suspender" : "Activar"}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={open} title={editing ? "Editar vendedor" : "Crear vendedor"} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            if (editing) formData.set("id", editing.id);
            const result = await upsertSellerAction(formData);
            setMessage(result.ok ? "Guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) setOpen(false);
          }}
        >
          <input name="name" defaultValue={editing?.name} placeholder="Nombre" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="businessName" defaultValue={editing?.businessName} placeholder="Negocio" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="slug" defaultValue={editing?.slug} placeholder="slug" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="email" defaultValue={editing?.email} placeholder="Correo" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="whatsapp" defaultValue={editing?.whatsapp} placeholder="WhatsApp" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <select name="status" defaultValue={editing?.status ?? "activo"} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="suspendido">Suspendido</option>
            <option value="desactivado">Desactivado</option>
          </select>
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Modal>
      <ConfirmationDialog
        open={Boolean(confirm)}
        title="Cambiar estado"
        description="La operación se aplica en base de datos cuando Supabase está configurado."
        confirmLabel="Confirmar"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const next: SellerStatus = confirm.status === "activo" ? "suspendido" : "activo";
          const result = await setSellerStatusAction(confirm.id, next);
          setMessage(result.ok ? "Estado actualizado." : result.error ?? "No se pudo actualizar");
          setConfirm(null);
        }}
      />
    </div>
  );
}
