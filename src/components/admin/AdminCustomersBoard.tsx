"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  adminDeleteCustomerAction,
  adminSetCustomerStatusAction,
  adminUpsertCustomerAction,
} from "@/app/actions/admin-customers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmationDialog, Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import { whatsappParaMostrar } from "@/lib/clientes";
import { formatDate } from "@/lib/format";
import type { CustomerRow } from "@/lib/selectors";
import type { Seller } from "@/lib/types";

const field =
  "h-11 w-full rounded-xl border border-[#253047] bg-[#0B111C] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50";

export function AdminCustomersBoard({ rows, sellers }: { rows: CustomerRow[]; sellers: Seller[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState<CustomerRow | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const directSeller = sellers.find((item) => item.slug === "venta-directa");
  const otherSellers = sellers.filter((item) => item.slug !== "venta-directa");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.whatsapp, row.email, row.sellerName].some((value) =>
        String(value ?? "").toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  function show(result: { ok: boolean; message?: string; error?: string }) {
    setMessage({ ok: result.ok, text: result.ok ? (result.message ?? "Listo.") : (result.error ?? "No se pudo.") });
    if (result.ok) router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await adminUpsertCustomerAction(new FormData(event.currentTarget));
      show(result);
      if (result.ok) {
        setOpen(false);
        setEditing(null);
      }
    } catch {
      show({ ok: false, error: "No se pudo guardar. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  async function togglePause(row: CustomerRow) {
    setPending(true);
    try {
      show(await adminSetCustomerStatusAction(row.id, row.status === "activo"));
    } catch {
      show({ ok: false, error: "No se pudo cambiar el estado." });
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const row = deleting;
    setDeleting(null);
    setPending(true);
    try {
      show(await adminDeleteCustomerAction(row.id));
    } catch {
      show({ ok: false, error: "No se pudo eliminar." });
    } finally {
      setPending(false);
    }
  }

  const editingSellerId =
    editing && editing.sellerId !== directSeller?.id ? editing.sellerId : "";

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Todos los clientes. Los tuyos quedan como “Venta directa”. Al crear un cliente ya puede entrar con su celular."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Nuevo cliente
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, celular, correo o vendedor"
          className={`${field} max-w-md`}
        />
        {message ? (
          <p className={`text-sm font-medium ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
        ) : null}
      </div>

      <Card>
        <DataTable
          rows={visible}
          empty="Aún no hay clientes."
          columns={[
            { key: "name", header: "Cliente", render: (row) => <span className="font-medium text-white">{row.name}</span> },
            { key: "seller", header: "Vendedor", render: (row) => row.sellerName ?? "—" },
            { key: "whatsapp", header: "Celular", render: (row) => whatsappParaMostrar(row.whatsapp) },
            { key: "email", header: "Correo", render: (row) => row.email || "—" },
            { key: "active", header: "Servicios activos", render: (row) => row.activeServices },
            {
              key: "next",
              header: "Próximo vencimiento",
              render: (row) => (row.nextExpiry ? formatDate(row.nextExpiry) : "—"),
            },
            { key: "status", header: "Acceso", render: (row) => <CustomerStatusBadge status={row.status} /> },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="h-8 px-3 py-1 text-xs"
                    onClick={() => {
                      setEditing(row);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 px-3 py-1 text-xs"
                    disabled={pending}
                    onClick={() => togglePause(row)}
                  >
                    {row.status === "activo" ? "Pausar" : "Reactivar"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 px-3 py-1 text-xs text-red-400"
                    disabled={pending}
                    onClick={() => setDeleting(row)}
                  >
                    Eliminar
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <form key={editing?.id ?? "nuevo"} onSubmit={submit} className="space-y-3">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <label className="block text-sm text-[#CBD5E1]">
            Nombre
            <input name="name" defaultValue={editing?.name ?? ""} required className={`${field} mt-1`} />
          </label>
          <label className="block text-sm text-[#CBD5E1]">
            Celular (9 dígitos) — con este número entra a su panel
            <input
              name="whatsapp"
              inputMode="numeric"
              defaultValue={editing ? whatsappParaMostrar(editing.whatsapp) : ""}
              required
              placeholder="987654321"
              className={`${field} mt-1`}
            />
          </label>
          <label className="block text-sm text-[#CBD5E1]">
            Correo (opcional)
            <input name="email" type="email" defaultValue={editing?.email ?? ""} className={`${field} mt-1`} />
          </label>
          <label className="block text-sm text-[#CBD5E1]">
            ¿De quién es este cliente?
            <select name="sellerId" defaultValue={editingSellerId} className={`${field} mt-1`}>
              <option value="">Venta directa (mío)</option>
              {otherSellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : editing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleting)}
        title="Eliminar cliente"
        description={`¿Seguro que quieres eliminar a ${deleting?.name ?? "este cliente"}? Esto no se puede deshacer. Si tiene servicios o pedidos, no se eliminará: en ese caso usa "Pausar".`}
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
