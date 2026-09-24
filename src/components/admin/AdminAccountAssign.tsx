"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { assignAccountToSellerAction, removeAssignedAccountAction } from "@/app/actions/business";
import { Card, CardHeader } from "@/components/ui/Card";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatDdMmYyyy } from "@/lib/cuenta-salud";
import type { AdminAssignedAccount } from "@/lib/data/queries";
import type { Platform, Seller } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-xl border border-[#253047] bg-[#070B14] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50";

export function AdminAccountAssign({
  sellers,
  platforms,
  assigned,
}: {
  sellers: Seller[];
  platforms: Platform[];
  assigned: AdminAssignedAccount[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [saleKind, setSaleKind] = useState<"full" | "profiles">("full");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

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
        const count = "count" in result && typeof result.count === "number" ? result.count : 1;
        setMessage({ ok: true, text: count > 1 ? `${count} cuentas asignadas al vendedor.` : "Cuenta asignada al vendedor." });
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

  async function remove(id: string) {
    if (!window.confirm("¿Quitar esta cuenta del vendedor?")) return;
    const result = await removeAssignedAccountAction(id);
    if (result.ok) router.refresh();
    else setMessage({ ok: false, text: result.error ?? "No se pudo quitar." });
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
          <select name="sellerId" required className={inputClass} defaultValue="">
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
            <input name="label" placeholder="Nombre del perfil (opcional)" className={inputClass} />
          ) : null}
          <input name="expiresAt" type="date" className={inputClass} />
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
        <CardHeader title="Cuentas asignadas" description={`${assigned.length} en total`} />
        {assigned.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#94A3B8]">Aún no has asignado cuentas.</p>
        ) : (
          <ul className="divide-y divide-[#253047]">
            {assigned.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <PlatformName platform={platforms.find((p) => p.id === item.platformId) ?? item.platformId} size="table" />
                  <p className="truncate text-[#F8FAFC]">{item.email}</p>
                  <p className="text-xs text-[#94A3B8]">
                    Vendedor: {sellers.find((s) => s.id === item.sellerId)?.name ?? "—"}
                    {item.expiresAt ? ` · Vence ${formatDdMmYyyy(item.expiresAt)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="h-9 rounded-lg border border-[#253047] bg-[#1B2436] px-3 text-xs font-semibold text-white hover:border-red-400/50"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
