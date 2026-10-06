"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resumePausedAccountAction } from "@/app/actions/code-controls";
import type { AccountChangeAlert } from "@/lib/account-alerts";

const KIND_LABEL: Record<AccountChangeAlert["kind"], string> = {
  password: "cambio o intento de cambio de contraseña",
  email: "cambio o intento de cambio de correo",
  account: "cambio o intento de cambio en la cuenta",
};

function limaTime(ms?: number) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

/** Aviso en el inicio del administrador. No pausa la cuenta ni corta los códigos. */
export function AccountChangeAlerts({ alerts }: { alerts: AccountChangeAlert[] }) {
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [hiddenEmails, setHiddenEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setHiddenEmails((current) => (current.length ? [] : current));
  }, [alerts]);
  const visible = alerts.filter((alert) => !hiddenEmails.includes(alert.email.trim().toLowerCase()));
  if (!visible.length && !error) return null;

  async function dismiss(email: string) {
    setPendingEmail(email);
    setError(null);
    try {
      const result = await resumePausedAccountAction(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHiddenEmails((current) => [...current, email.trim().toLowerCase()]);
      router.refresh();
    } catch {
      setError("No se pudo cerrar el aviso. Inténtalo de nuevo.");
    } finally {
      setPendingEmail(null);
    }
  }

  return (
    <section className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-bold text-amber-200">Avisos de Disney: cambio o intento de cambio de clave o correo</p>
      <p className="mt-1 text-xs text-amber-100/80">Los códigos de estas cuentas se siguen entregando.</p>
      {error ? <p className="mt-2 text-xs font-medium text-amber-100">{error}</p> : null}
      <ul className="mt-2 space-y-2">
        {visible.map((alert) => (
          <li key={`${alert.id}-${alert.email}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-[#E2E8F0]">
            <p>
              <span className="font-semibold text-white">{alert.email || "Correo desconocido"}</span>
              {" · "}
              {KIND_LABEL[alert.kind]}
              {alert.at ? <span className="text-[#94A3B8]"> · {limaTime(alert.at)}</span> : null}
            </p>
            <p className="mt-0.5 text-xs text-[#CBD5E1]">
              {alert.requesterName
                ? `Último código pedido por ${alert.requesterKind === "cliente" ? "el cliente" : "el vendedor"}: ${alert.requesterName}`
                : "Nadie pidió un código de esta cuenta desde el panel."}
            </p>
            <button
              type="button"
              disabled={pendingEmail === alert.email}
              onClick={() => dismiss(alert.email)}
              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-[#1C1917] disabled:opacity-50"
            >
              {pendingEmail === alert.email ? "Cerrando..." : "Entendido"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
