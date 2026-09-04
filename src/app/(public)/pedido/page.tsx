import type { Metadata } from "next";
import { OrderLookupForm } from "@/components/orders/OrderLookupForm";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
};

export default function PedidoPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <OrderLookupForm />
    </main>
  );
}
