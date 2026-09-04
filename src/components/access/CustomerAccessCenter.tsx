"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformLogo, PlatformName } from "@/components/ui/PlatformLogo";
import { EmailLookupResultCard } from "@/components/email/EmailLookupResult";
import { simulateLookup } from "@/lib/access-center";
import type { EmailLookupResult, Platform, Subscription } from "@/lib/types";

/** SIMULACIÓN: Buscar mensaje no lee Gmail real. El correo mostrado sí es el de la cuenta del servicio. */

export function CustomerAccessCenter({
  services,
  platforms,
  customerId,
  sellerId,
}: {
  services: Subscription[];
  platforms: Platform[];
  customerId: string;
  sellerId: string;
}) {
  const [selected, setSelected] = useState<Subscription | null>(services[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<EmailLookupResult | null>(null);

  function search() {
    if (!selected) return;
    setLoading(true);
    window.setTimeout(() => {
      const next = attempts + 1;
      setAttempts(next);
      setResult(
        simulateLookup(
          {
            customerId,
            sellerId,
            subscriptionId: selected.id,
            platformId: selected.platformId,
            connectedEmailAccountId: selected.connectedEmailAccountId,
            platformEmailAssignmentId: selected.platformEmailAssignmentId,
          },
          selected,
          next,
        ),
      );
      setLoading(false);
    }, 700);
  }

  if (!services.length) {
    return (
      <Card className="p-5 text-sm text-slate-400">
        Todavía no tienes un servicio activo. Cuando tu vendedor te asigne una cuenta, el correo aparecerá aquí.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {services.map((subscription) => {
          const platform = platforms.find((item) => item.id === subscription.platformId);
          const active = selected?.id === subscription.id;
          return (
            <button
              key={subscription.id}
              type="button"
              onClick={() => {
                setSelected(subscription);
                setResult(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm ${
                active ? "bg-white text-slate-950" : "border border-white/10 text-slate-300"
              }`}
            >
              {platform ? <PlatformLogo platform={platform} size="filter" /> : null}
              {platform?.name}
            </button>
          );
        })}
      </div>
      {selected ? (
        <Card className="space-y-4 p-5">
          <p className="text-sm text-slate-400">
            Correo o usuario de tu cuenta{" "}
            <PlatformName
              platform={platforms.find((item) => item.id === selected.platformId) ?? selected.platformId}
              size="table"
              className="align-middle text-slate-200"
            />
          </p>
          <p className="font-medium text-white">
            {selected.platformEmail || "Tu vendedor aún no cargó el usuario de esta cuenta."}
          </p>
          {selected.accessPassword ? (
            <p className="text-sm text-slate-300">PIN: <span className="text-white">{selected.accessPassword}</span></p>
          ) : null}
          {selected.accessProfile ? (
            <p className="text-sm text-slate-300">Perfil: <span className="text-white">{selected.accessProfile}</span></p>
          ) : null}
          {selected.notes ? (
            <p className="text-sm text-slate-400">{selected.notes}</p>
          ) : null}
          <Button onClick={search} disabled={loading || !selected.platformEmail}>
            {loading ? "Buscando mensaje..." : "Buscar código"}
          </Button>
          <p className="text-xs text-slate-500">
            Buscar código es una simulación por ahora. El correo de arriba sí es el de tu servicio.
          </p>
        </Card>
      ) : null}
      {result ? <EmailLookupResultCard result={result} /> : null}
      {result?.status === "NOT_FOUND" ? (
        <Button variant="secondary" onClick={search}>
          Buscar nuevamente
        </Button>
      ) : null}
    </div>
  );
}
