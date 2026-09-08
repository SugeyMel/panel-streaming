"use client";

import { useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import {
  getSeenAlertsServerSnapshot,
  getSeenAlertsSnapshot,
  markAlertSeen,
  subscribeSeenAlerts,
} from "@/lib/seen-alerts";

export function DeliveredOrderAlert({
  id,
  code,
  platformName,
  deliveryNote,
  deliveredAt,
}: {
  id: string;
  code: string;
  platformName: string;
  deliveryNote?: string;
  deliveredAt?: string | null;
}) {
  const [stopped, setStopped] = useState(false);
  const seenRaw = useSyncExternalStore(
    subscribeSeenAlerts,
    getSeenAlertsSnapshot,
    getSeenAlertsServerSnapshot,
  );
  const wiggle =
    !stopped &&
    seenRaw !== "__ssr__" &&
    (() => {
      try {
        const seen = JSON.parse(seenRaw) as unknown;
        return !Array.isArray(seen) || !seen.map(String).includes(id);
      } catch {
        return true;
      }
    })();

  function stop() {
    markAlertSeen(id);
    setStopped(true);
  }

  return (
    <div className={wiggle ? "alert-wiggle" : undefined}>
      <Card className="cursor-pointer border border-[#34D399]/50 bg-[#022C22]/80 p-4 text-sm text-[#D1FAE5]">
        <button type="button" className="block w-full text-left" onClick={stop}>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#34D399] uppercase">{platformName}</p>
          <p className="mt-1 text-[11px] font-medium text-[#6EE7B7]">Servicio entregado · {code}</p>
          {deliveredAt ? (
            <p className="mt-1 text-sm text-[#6EE7B7]">Hora de entrega: {formatDateTime(deliveredAt)}</p>
          ) : null}
          <p className="mt-2 text-[#A7F3D0]">{deliveryNote || "El acceso ya está en Centro de acceso."}</p>
        </button>
        <a
          href="/cliente/acceso"
          className="mt-3 inline-block font-medium text-[#34D399] underline-offset-2 hover:underline"
        >
          Ver acceso
        </a>
      </Card>
    </div>
  );
}
