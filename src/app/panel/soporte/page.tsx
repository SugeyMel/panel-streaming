"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SupportTicket } from "@/components/support/SupportTicket";
import { customerSupport, sellerSupport } from "@/data/mock";
import { CURRENT_SELLER_ID } from "@/lib/session";
import { getCustomer } from "@/lib/selectors";

export default function SellerSupportPage() {
  const incoming = customerSupport.filter((item) => item.sellerId === CURRENT_SELLER_ID);
  const outgoing = sellerSupport.filter((item) => item.sellerId === CURRENT_SELLER_ID);

  return (
    <div className="space-y-6">
      <PageHeader title="Soporte" description="Atiende a tus clientes o pide ayuda al administrador." />
      <div className="grid gap-4">
        {incoming.map((ticket) => (
          <SupportTicket
            key={ticket.id}
            ticket={ticket}
            customerName={getCustomer(ticket.customerId)?.name ?? "Cliente"}
          />
        ))}
      </div>
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-white">Solicitud al administrador</h2>
        <label className="block text-sm text-slate-300">
          Plataforma
          <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" defaultValue="Netflix" />
        </label>
        <label className="block text-sm text-slate-300">
          Cliente relacionado (opcional)
          <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" defaultValue="Carlos" />
        </label>
        <label className="block text-sm text-slate-300">
          Tipo
          <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" defaultValue="Acceso" />
        </label>
        <label className="block text-sm text-slate-300">
          Descripción
          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" defaultValue={outgoing[0]?.description} />
        </label>
        <Button>Enviar solicitud</Button>
      </Card>
    </div>
  );
}
