import { Card } from "@/components/ui/Card";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { formatCurrency } from "@/lib/format";

export default async function StoreOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Card className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-white">¡Pedido recibido!</h1>
        <p className="text-sm text-slate-400">Estamos verificando tu comprobante.</p>
        <div className="grid gap-2 text-sm text-slate-300">
          <p>Número de pedido: <span className="text-white">{codigo ?? "PS-2026-0007"}</span></p>
          <p>Plataforma: <span className="text-white">Netflix</span></p>
          <p>Plan: <span className="text-white">1 mes</span></p>
          <p>Monto: <span className="text-white">{formatCurrency(18)}</span></p>
          <p>Cliente: <span className="text-white">Carlos</span></p>
          <p>WhatsApp: <span className="text-white">987654321</span></p>
          <p>Estado: <span className="text-white">Pago enviado</span></p>
        </div>
        <OrderProgress currentStep={1} />
        <p className="text-sm text-slate-400">
          Si tienes cuenta, el pedido aparece en{" "}
          <a href="/cliente/pedidos" className="text-cyan-300">
            Mis pedidos
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
