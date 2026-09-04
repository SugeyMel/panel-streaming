"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewOrderAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";

export function OrderReviewButtons({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canReview = status === "pago_enviado" || status === "pendiente_pago";

  async function run(approve: boolean) {
    setPending(true);
    const result = await reviewOrderAction(orderId, approve);
    setMessage(result.ok ? (approve ? "Pedido aprobado. Ahora entrega el servicio." : "Pedido rechazado.") : result.error ?? "No se pudo revisar");
    setPending(false);
    if (result.ok) router.refresh();
  }

  if (!canReview) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pending} onClick={() => run(true)}>Aprobar</Button>
      <Button variant="secondary" disabled={pending} onClick={() => run(false)}>Rechazar</Button>
      {message ? <p className="w-full text-sm text-cyan-300">{message}</p> : null}
    </div>
  );
}
