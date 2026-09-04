"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Filters } from "@/components/ui/Filters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { namedOrder } from "@/lib/selectors";
import type { Order, OrderStatus } from "@/lib/types";

const options = [
  { value: "todos", label: "Todos" },
  { value: "pendiente_pago", label: "Pendiente de pago" },
  { value: "pago_enviado", label: "Pago enviado" },
  { value: "pago_aprobado", label: "Pago aprobado" },
  { value: "preparando", label: "Preparando" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export function OrdersBrowser({ orders, showSeller }: { orders: Order[]; showSeller?: boolean }) {
  const [status, setStatus] = useState<(typeof options)[number]["value"]>("todos");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const named = namedOrder(order);
      const matchStatus = status === "todos" || order.status === (status as OrderStatus);
      const value = query.trim().toLowerCase();
      return (
        matchStatus &&
        (!value ||
          `${named.code} ${named.sellerName} ${named.customerName} ${named.whatsapp}`.toLowerCase().includes(value))
      );
    });
  }, [orders, status, query]);

  return (
    <div className="space-y-4">
      <PageHeader title="Pedidos" description="Listado con búsqueda y filtros." />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Filters value={status} onChange={setStatus} options={[...options]} />
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar por pedido, vendedor, cliente o WhatsApp" />
      </div>
      <Card>
        <OrdersTable orders={filtered} showSeller={showSeller} />
      </Card>
    </div>
  );
}
