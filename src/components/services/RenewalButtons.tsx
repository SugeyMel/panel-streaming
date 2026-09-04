"use client";

import { Button } from "@/components/ui/Button";
import type { Subscription } from "@/lib/types";

export function RenewalButtons({ service }: { service: Subscription }) {
  const intent = service.renewalIntent ?? "none";

  if (intent === "decline") {
    return (
      <p className="mt-4 text-sm font-medium text-[#94A3B8]">
        Se procede con la finalización de tu servicio.
      </p>
    );
  }
  if (intent === "renew") {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-sm text-[#22C55E]">Renovación en revisión.</p>
        <Button href={`/cliente/renovar/${service.id}`} variant="success" className="w-full min-h-12">
          Enviar comprobante
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Button
        href={`/cliente/servicios/${service.id}/no-renovar`}
        variant="danger"
        className="min-h-12 rounded-[14px]"
      >
        No renuevo
      </Button>
      <Button href={`/cliente/renovar/${service.id}`} variant="success" className="min-h-12 rounded-[14px]">
        Sí renuevo
      </Button>
    </div>
  );
}
