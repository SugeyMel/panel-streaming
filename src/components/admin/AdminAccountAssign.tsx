"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  assignAccountToSellerAction,
  removeAssignedAccountAction,
  setAssignedAccountActiveAction,
  updateAssignedAccountAction,
} from "@/app/actions/business";
import { Card, CardHeader } from "@/components/ui/Card";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatDdMmYyyy } from "@/lib/cuenta-salud";
import type { AdminAssignedAccount } from "@/lib/data/queries";
import type { Platform, Seller } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-xl border border-[#253047] bg-[#070B14] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50";

function openExpiresAtPicker(event: MouseEvent<HTMLInputElement>) {
  // iPhone y escritorio abren el selector con el toque o el clic nativo.
  // Chrome Android recibe el toque en el campo y no abre el diálogo.
  if (!/Android/i.test(navigator.userAgent)) return;
  const input = event.currentTarget;
  if (typeof input.showPicker !== "function") return;
  event.preventDefault();
  try {
    input.showPicker();
  } catch {
    // El navegador rechazó el gesto; el icono nativo sigue pudiendo abrirlo.
  }
}

function ExpiresAtField({ defaultValue }: { defaultValue?: string }) {
  const [android, setAndroid] = useState(false);
  useEffect(() => {
    setAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  return (
    <input
      name="expiresAt"
      type="date"
      aria-label="Fecha de vencimiento"
      defaultValue={defaultValue}
      className={`${inputClass} native-date${android ? " native-date-android" : ""}`}
      onClick={openExpiresAtPicker}
    />
  );
}

export function AdminAccountAssign({
  sellers,
  platforms,
  assigned,
  directSellerId = null,
  directCustomers = [],
  filterCustomerId = null,
}: {
  sellers: Seller[];
  platforms: Platform[];
  assigned: AdminAssignedAccount[];
  directSellerId?: string | null;
  directCustomers?: { id: string; name: string }[];
  filterCustomerId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [saleKind, setSaleKind] = useState<"full" | "profiles">("full");
  const [sellerId, setSellerId] = useState("");
  const [pinMode, setPinMode] = useState<"none" | "pin">("none");
  const isDirect = Boolean(directSellerId) && sellerId === directSellerId;
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Desde Clientes → "Ver cuentas": solo las cuentas de ese cliente.
  const shown = filterCustomerId ? assigned.filter((item) => item.customerId === filterCustomerId) : assigned;
  const filterName = filterCustomerId
    ? directCustomers.find((item) => item.id === filterCustomerId)?.name ?? "este cliente"
    : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);
    try {
      const result = await assignAccountToSellerAction(new FormData(form));
      if (result.ok) {
        form.reset();
        setSellerId("");
        setPinMode("none");
        const count = "count" in result && typeof result.count === "number" ? result.count : 1;
        const attached = "attached" in result && typeof result.attached === "number" ? result.attached : 0;
        const text = attached > 0 && attached === count
          ? attached > 1
            ? `${attached} perfiles entregados en la misma cuenta.`
            : "Perfil entregado. La cuenta queda en otro cliente."
          : attached > 0
            ? "Listo. Los correos repetidos se entregaron como otro perfil."
            : count > 1
              ? `${count} cuentas asignadas al vendedor.`
              : "Cuenta asignada al vendedor.";
        setMessage({ ok: true, text });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error ?? "No se pudo asignar." });
      }
    } catch {
      setMessage({ ok: false, text: "No se pudo asignar. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string, serviceId: string | null) {
    const question = serviceId
      ? "¿Quitar este perfil? Si era el único de la cuenta, la cuenta también se elimina."
      : "¿Eliminar esta cuenta? Se borra para siempre. Si solo quieres pausarla, usa Desactivar.";
    if (!window.confirm(question)) return;
    const result = await removeAssignedAccountAction(id, serviceId ?? undefined);
    if (result.ok) router.refresh();
    else setMessage({ ok: false, text: result.error ?? "No se pudo eliminar." });
  }

  async function toggleActive(id: string, active: boolean, serviceId: string | null) {
    const result = await setAssignedAccountActiveAction(id, active, serviceId ?? undefined);
    if (result.ok) router.refresh();
    else setMessage({ ok: false, text: result.error ?? "No se pudo cambiar el estado." });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Asignar cuenta a un vendedor"
          description="Aparecerá en “Mis cuentas” del vendedor."
          action={
            <button
              type="button"
              onClick={() => setBulk((value) => !value)}
              className="h-9 rounded-lg border border-[#253047] bg-[#1B2436] px-3 text-xs font-semibold text-white hover:border-violet-400/50"
            >
              {bulk ? "Asignar una sola" : "Asignar varias a la vez"}
            </button>
          }
        />
        <form onSubmit={submit} className="grid gap-3 p-5 sm:grid-cols-2">
          <select
            name="sellerId"
            required
            className={inputClass}
            value={sellerId}
            onChange={(event) => setSellerId(event.target.value)}
          >
            <option value="" disabled>Vendedor</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>{seller.name}</option>
            ))}
          </select>
          <select name="platformId" required className={inputClass} defaultValue="">
            <option value="" disabled>Plataforma</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>{platform.name}</option>
            ))}
          </select>
          {isDirect ? (
            <div className="sm:col-span-2">
              <select name="customerId" required className={inputClass} defaultValue="">
                <option value="" disabled>Cliente</option>
                {directCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
              {directCustomers.length === 0 ? (
                <p className="mt-1 text-xs text-[#94A3B8]">Aún no tienes clientes directos. Créalos en Clientes.</p>
              ) : null}
            </div>
          ) : null}
          {bulk ? (
            <div className="sm:col-span-2">
              <textarea
                name="bulk"
                required
                rows={6}
                placeholder={"Una cuenta por línea: correo y clave\ncorreo1@gmail.com clave1\ncorreo2@gmail.com clave2"}
                className="w-full rounded-xl border border-[#253047] bg-[#070B14] px-3 py-3 font-mono text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50"
              />
              <p className="mt-1 text-xs text-[#94A3B8]">
                Todas tendrán el mismo vendedor, plataforma, tipo y vencimiento. Puedes separar correo y clave con espacio, coma o “:”.
              </p>
            </div>
          ) : (
            <>
              <input name="email" required placeholder="Correo / usuario de la cuenta" className={inputClass} />
              <input name="password" placeholder="Clave de la cuenta" className={inputClass} />
            </>
          )}
          <select
            name="saleKind"
            value={saleKind}
            onChange={(event) => setSaleKind(event.target.value === "full" ? "full" : "profiles")}
            className={inputClass}
          >
            <option value="full">Cuenta completa</option>
            <option value="profiles">Perfiles</option>
          </select>
          {saleKind === "profiles" ? (
            <div>
              <input name="label" placeholder="Nombre del perfil (opcional)" className={inputClass} />
              <p className="mt-1 text-xs text-[#94A3B8]">
                El mismo correo puede ir a varios clientes: elige al cliente y escribe el nombre de su perfil.
              </p>
            </div>
          ) : null}
          {isDirect ? (
            <>
              <select
                name="pinMode"
                value={pinMode}
                onChange={(event) => setPinMode(event.target.value === "pin" ? "pin" : "none")}
                className={inputClass}
              >
                <option value="none">No tiene PIN</option>
                <option value="pin">Tiene PIN</option>
              </select>
              {pinMode === "pin" ? (
                <input name="pin" required inputMode="numeric" placeholder="PIN del perfil" className={inputClass} />
              ) : null}
            </>
          ) : null}
          <ExpiresAtField />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Asignando..." : "Asignar cuenta"}
            </button>
            {message ? (
              <span className={`ml-3 text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</span>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={filterName ? `Cuentas de ${filterName}` : "Cuentas asignadas"}
          description={`${shown.length} en total`}
          action={
            filterCustomerId ? (
              <Link
                href="/admin/cuentas"
                className="inline-flex h-9 items-center rounded-lg border border-[#253047] bg-[#1B2436] px-3 text-xs font-semibold text-white hover:border-violet-400/50"
              >
                Ver todas
              </Link>
            ) : undefined
          }
        />
        {shown.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#94A3B8]">Aún no has asignado cuentas.</p>
        ) : (
          <ul className="divide-y divide-[#253047]">
            {shown.map((item) => {
              const rowKey = item.serviceId ? `${item.id}:${item.serviceId}` : item.id;
              return (
              <li key={rowKey} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <PlatformName platform={platforms.find((p) => p.id === item.platformId) ?? item.platformId} size="table" />
                    {!item.active ? (
                      <span className="rounded-full bg-[#475569] px-2 py-0.5 text-[10px] font-semibold text-white">Desactivada</span>
                    ) : null}
                  </div>
                  <p className="truncate text-[#F8FAFC]">{item.email}</p>
                  <p className="text-xs text-[#94A3B8]">
                    {item.sellerId === directSellerId && item.customerName
                      ? `Venta directa · Cliente: ${item.customerName}`
                      : `Vendedor: ${sellers.find((s) => s.id === item.sellerId)?.name ?? "—"}`}
                    {item.label ? ` · Perfil: ${item.label}` : ""}
                    {item.expiresAt ? ` · Vence ${formatDdMmYyyy(item.expiresAt)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === rowKey ? null : rowKey)}
                    className="h-9 rounded-lg border border-[#253047] bg-[#1B2436] px-3 text-xs font-semibold text-white hover:border-violet-400/50"
                  >
                    {editingId === rowKey ? "Cerrar" : "Editar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(item.id, !item.active, item.serviceId)}
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold ${
                      item.active
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-200 hover:border-amber-400/70"
                        : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:border-emerald-400/70"
                    }`}
                  >
                    {item.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id, item.serviceId)}
                    className="h-9 rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-semibold text-red-200 hover:border-red-400/70"
                  >
                    Eliminar
                  </button>
                </div>
                {editingId === rowKey ? (
                  <EditAssignedForm
                    item={item}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                  />
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EditAssignedForm({ item, onDone }: { item: AdminAssignedAccount; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<"none" | "pin">(item.pin ? "pin" : "none");
  const isCustomer = Boolean(item.customerId);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await updateAssignedAccountAction(new FormData(event.currentTarget));
      if (result.ok) onDone();
      else setError(result.error ?? "No se pudo guardar.");
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="grid w-full gap-2 rounded-xl border border-[#253047] bg-[#0B111C] p-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={item.id} />
      {item.serviceId ? <input type="hidden" name="serviceId" value={item.serviceId} /> : null}
      <input name="email" required defaultValue={item.email} placeholder="Correo de la cuenta" className={inputClass} />
      <input name="password" defaultValue={item.password} placeholder="Clave de la cuenta" className={inputClass} />
      <input name="label" defaultValue={item.label} placeholder="Nombre del perfil (opcional)" className={inputClass} />
      <ExpiresAtField defaultValue={item.expiresAt ?? ""} />
      {isCustomer ? (
        <>
          <select
            name="pinMode"
            value={pinMode}
            onChange={(event) => setPinMode(event.target.value === "pin" ? "pin" : "none")}
            className={inputClass}
          >
            <option value="none">No tiene PIN</option>
            <option value="pin">Tiene PIN</option>
          </select>
          {pinMode === "pin" ? (
            <input name="pin" required inputMode="numeric" defaultValue={item.pin} placeholder="PIN del perfil" className={inputClass} />
          ) : null}
        </>
      ) : null}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {error ? <span className="text-sm text-red-300">{error}</span> : null}
      </div>
    </form>
  );
}
