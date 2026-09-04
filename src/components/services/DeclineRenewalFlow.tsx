"use client";

import { useState } from "react";
import { declineRenewalAction } from "@/app/actions/business";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { formatDate } from "@/lib/format";

export function DeclineRenewalFlow({
  serviceId,
  endDate,
}: {
  serviceId: string;
  endDate: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center px-2 text-center">
        <div className="mt-10 flex h-24 w-24 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#06B6D4]">
          <CheckIcon className="h-12 w-12" />
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-[#F8FAFC]">GRACIAS</h1>
        <p className="mt-3 text-base text-[#F8FAFC]">Se procede con la finalización de tu servicio.</p>
        <p className="mt-4 max-w-sm text-sm text-[#94A3B8]">
          Tu servicio continuará activo hasta el {formatDate(endDate)} y luego finalizará.
        </p>
        <div className="sticky-app-cta mt-auto w-full pt-10">
          <Button href="/cliente" className="w-full min-h-12">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <ScreenHeader title="No renovar" backHref={`/cliente/servicios/${serviceId}`} />
      <div className="flex flex-1 flex-col items-center px-2 text-center">
        <div className="mt-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#EF4444]/15 text-[#EF4444]">
          <AlertIcon className="h-12 w-12" />
        </div>
        <h2 className="mt-8 max-w-xs text-2xl font-semibold leading-tight text-[#F8FAFC]">
          ¿Seguro que no deseas renovar este servicio?
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#94A3B8]">
          Tu servicio continuará activo hasta su fecha de vencimiento ({formatDate(endDate)}) y luego
          finalizará.
        </p>
        {error ? <p className="mt-4 text-sm text-[#EF4444]">{error}</p> : null}
      </div>
      <div className="sticky-app-cta space-y-3">
        <Button
          type="button"
          variant="danger"
          className="w-full min-h-12"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            const result = await declineRenewalAction(serviceId);
            setPending(false);
            if (!result.ok) {
              setError(result.error ?? "No se pudo guardar");
              return;
            }
            setDone(true);
          }}
        >
          {pending ? "Guardando..." : "Sí, no renovar"}
        </Button>
        <Button href={`/cliente/servicios/${serviceId}`} variant="secondary" className="w-full min-h-12">
          Volver
        </Button>
      </div>
    </div>
  );
}
