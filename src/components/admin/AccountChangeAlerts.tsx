"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resumePausedAccountAction } from "@/app/actions/code-controls";
import type { AccountChangeAlert } from "@/lib/account-alerts";

const KIND_LABEL: Record<AccountChangeAlert["kind"], string> = {
  password: "cambio de contraseña",
  email: "cambio de correo",
  account: "cambio en la cuenta",
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

/** Alerta en el inicio del administrador: Disney avisó un cambio y la cuenta quedó pausada. */
export function AccountChangeAlerts({ alerts }: { alerts: AccountChangeAlert[] }) {
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  if (!alerts.length) return null;

  async function resume(email: string) {
    setPendingEmail(email);
    try {
      await resumePausedAccountAction(email);
      router.refresh();
    } finally {
      setPendingEmail(null);
    }
  }

  return (
    <section className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-bold text-amber-200">⚠️ Cuentas de Disney pausadas por cambio de correo o clave</p>
      <ul className="mt-2 space-y-2">
        {alerts.map((alert) => (
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
              onClick={() => resume(alert.email)}
              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-[#1C1917] disabled:opacity-50"
            >
              {pendingEmail === alert.email ? "Reactivando..." : "Reactivar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
