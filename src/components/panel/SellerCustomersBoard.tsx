"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sellerSetCustomerStatusAction, sellerUpsertCustomerAction } from "@/app/actions/seller-customers";
import { UsersIcon, WhatsAppIcon } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { adminWhatsappLink } from "@/lib/admin-contact";
import { whatsappParaMostrar } from "@/lib/clientes";
import type { Customer } from "@/lib/types";

const field =
  "h-11 w-full rounded-xl border border-[#253047] bg-[#070B14] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50";
const smallBtn =
  "inline-flex h-8 items-center rounded-lg border border-[#253047] bg-[#111827] px-3 text-xs font-semibold text-white hover:bg-[#172033] disabled:opacity-50";

/** Mi Bot → clientes con acceso del vendedor: crear (si está permitido), editar y pausar/reactivar. */
export function SellerCustomersBoard({
  customers,
  canCreate,
  adminWhatsapp,
}: {
  customers: Customer[];
  canCreate: boolean;
  adminWhatsapp?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((row) =>
      [row.name, row.whatsapp, row.email].some((value) => String(value ?? "").toLowerCase().includes(q)),
    );
  }, [customers, query]);

  function show(result: { ok: boolean; message?: string; error?: string }) {
    setMessage({ ok: result.ok, text: result.ok ? (result.message ?? "Listo.") : (result.error ?? "No se pudo.") });
    if (result.ok) router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await sellerUpsertCustomerAction(new FormData(event.currentTarget));
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

  async function togglePause(row: Customer) {
    setPending(true);
    try {
      show(await sellerSetCustomerStatusAction(row.id, row.status === "activo"));
    } catch {
      show({ ok: false, error: "No se pudo cambiar el estado." });
    } finally {
      setPending(false);
    }
  }

  const contactHref = adminWhatsapp
    ? adminWhatsappLink(adminWhatsapp, "Hola, quiero activar la opción de crear accesos a mis clientes.")
    : "";

  return (
    <section className="rounded-2xl border border-[#253047] bg-[#0B111C] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#8B5CF6]/25 text-[#C4B5FD]">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">Mis clientes con acceso</h2>
            <p className="text-[13px] text-[#94A3B8]">
              Cada cliente entra a su panel con su correo. Si no te paga, pausa su acceso.
            </p>
          </div>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-4 text-sm font-semibold text-white hover:brightness-110"
          >
            + Crear cliente / acceso
          </button>
        ) : contactHref ? (
          <a
            href={contactHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#253047] bg-[#111827] px-4 text-sm font-semibold text-[#94A3B8]"
          >
            <WhatsAppIcon className="h-4 w-4 text-[#4ADE80]" />
            Crear clientes está desactivado · Contactar
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, celular o correo"
          className={`${field} max-w-sm`}
        />
        {message ? (
          <p className={`text-sm font-medium ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
        ) : null}
      </div>

      <div className="mt-3 overflow-x-auto">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#253047] px-3 py-8 text-center text-sm text-[#94A3B8]">
            Aún no tienes clientes con acceso.
          </p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] tracking-[0.12em] text-[#94A3B8] uppercase">
              <tr>
                <th className="px-2 py-2">Cliente</th>
                <th className="px-2 py-2">Correo (acceso)</th>
                <th className="px-2 py-2">Celular</th>
                <th className="px-2 py-2">Acceso</th>
                <th className="px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const active = row.status === "activo";
                return (
                  <tr key={row.id} className="border-t border-[#253047] text-[#E2E8F0]">
                    <td className="px-2 py-2.5 font-medium text-white">{row.name}</td>
                    <td className="px-2 py-2.5">{row.email || "—"}</td>
                    <td className="px-2 py-2.5">{whatsappParaMostrar(row.whatsapp)}</td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          active ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {active ? "Activo" : "Pausado"}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={smallBtn}
                          onClick={() => {
                            setEditing(row);
                            setOpen(true);
                          }}
                        >
                          Editar
                        </button>
                        <button type="button" className={smallBtn} disabled={pending} onClick={() => togglePause(row)}>
                          {active ? "Pausar" : "Reactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={open}
        title={editing ? "Editar cliente" : "Crear cliente / acceso"}
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
            Correo — con este correo entra a su panel
            <input
              name="email"
              type="email"
              required
              defaultValue={editing?.email ?? ""}
              placeholder="cliente@gmail.com"
              className={`${field} mt-1`}
            />
          </label>
          <label className="block text-sm text-[#CBD5E1]">
            Celular / WhatsApp (9 dígitos)
            <input
              name="whatsapp"
              inputMode="numeric"
              required
              defaultValue={editing ? whatsappParaMostrar(editing.whatsapp) : ""}
              placeholder="987654321"
              className={`${field} mt-1`}
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="h-11 rounded-xl border border-[#253047] px-4 text-sm text-white"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-60"
            >
              {pending ? "Guardando..." : editing ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
