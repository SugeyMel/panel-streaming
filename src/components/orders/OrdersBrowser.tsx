"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Filters } from "@/components/ui/Filters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { namedOrder } from "@/lib/selectors";
import { whatsappParaMostrar } from "@/lib/clientes";
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

const sellerGroups = [
  { value: "todos", label: "Todos", statuses: null as OrderStatus[] | null },
  { value: "pendientes", label: "Pendientes", statuses: ["pendiente_pago", "pago_enviado"] as OrderStatus[] },
  { value: "revision", label: "En revisión", statuses: ["pago_enviado"] as OrderStatus[] },
  { value: "pagados", label: "Pagados", statuses: ["pago_aprobado", "preparando"] as OrderStatus[] },
  { value: "entregados", label: "Entregados", statuses: ["entregado"] as OrderStatus[] },
  { value: "rechazados", label: "Rechazados", statuses: ["cancelado"] as OrderStatus[] },
] as const;

export function OrdersBrowser({
  orders,
  showSeller,
  actionHref,
  groupedTabs = false,
}: {
  orders: Order[];
  showSeller?: boolean;
  actionHref?: string;
  groupedTabs?: boolean;
}) {
  const [status, setStatus] = useState<(typeof options)[number]["value"]>("todos");
  const [group, setGroup] = useState<(typeof sellerGroups)[number]["value"]>("pendientes");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const named = namedOrder(order);
      const matchStatus = groupedTabs
        ? sellerGroups.find((item) => item.value === group)?.statuses == null ||
          (sellerGroups.find((item) => item.value === group)?.statuses ?? []).includes(order.status)
        : status === "todos" || order.status === (status as OrderStatus);
      const value = query.trim().toLowerCase();
      return (
        matchStatus &&
        (!value ||
          `${named.code} ${named.sellerName} ${named.customerName} ${named.whatsapp} ${whatsappParaMostrar(named.whatsapp)}`.toLowerCase().includes(value))
      );
    });
  }, [orders, status, query, groupedTabs, group]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pedidos"
        description={groupedTabs ? "Estado, historial y detalle de cada pedido." : "Listado con búsqueda y filtros."}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {groupedTabs ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {sellerGroups.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setGroup(item.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  group === item.value
                    ? "bg-[#8B5CF6] text-white"
                    : "border border-[#253047] bg-[#111827] text-[#94A3B8]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <Filters value={status} onChange={setStatus} options={[...options]} />
        )}
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar por pedido, vendedor, cliente o WhatsApp" />
      </div>
      <Card>
        <OrdersTable orders={filtered} showSeller={showSeller} actionHref={actionHref} />
      </Card>
    </div>
  );
}
