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

/** Alerta en el inicio del administrador: Disney avisó que cambiaron la clave o el correo de una cuenta. */
export function AccountChangeAlerts({ alerts }: { alerts: AccountChangeAlert[] }) {
  if (!alerts.length) return null;
  return (
    <section className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-bold text-amber-200">⚠️ Disney avisó cambios en cuentas (últimas 24 horas)</p>
      <ul className="mt-2 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-[#E2E8F0]">
            <p>
              <span className="font-semibold text-white">{alert.email || "Correo desconocido"}</span>
              {" · "}
              {KIND_LABEL[alert.kind]}
              {alert.at ? <span className="text-[#94A3B8]"> · {limaTime(alert.at)}</span> : null}
            </p>
            <p className="mt-0.5 text-xs text-[#CBD5E1]">
              {alert.sellerName
                ? `Último código pedido por: ${alert.sellerName}${alert.lookupAt ? ` (${limaTime(alert.lookupAt)})` : ""}`
                : "Ningún vendedor pidió código de esta cuenta desde el panel."}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
