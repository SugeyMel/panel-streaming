import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { whatsappParaMostrar } from "@/lib/clientes";
import { namedOrder } from "@/lib/selectors";
import type { Order } from "@/lib/types";

function orderActionHref(template: string, orderId: string) {
  return template.includes("{id}") ? template.replaceAll("{id}", orderId) : template;
}

export function OrdersTable({
  orders,
  showSeller = false,
  actionHref,
  empty,
  showDeliveryTime = false,
}: {
  orders: Order[];
  showSeller?: boolean;
  actionHref?: string;
  empty?: string;
  showDeliveryTime?: boolean;
}) {
  const rows = orders.map(namedOrder);

  return (
    <DataTable
      rows={rows}
      empty={empty ?? "No hay registros para mostrar."}
      columns={[
        {
          key: "code",
          header: "Número",
          render: (order) => <span className="font-medium text-white">{order.code}</span>,
        },
        ...(showSeller
          ? [{ key: "seller", header: "Vendedor", render: (order: (typeof rows)[number]) => order.sellerName }]
          : []),
        { key: "customer", header: "Cliente", render: (order: (typeof rows)[number]) => order.customerName },
        { key: "whatsapp", header: "WhatsApp", render: (order: (typeof rows)[number]) => whatsappParaMostrar(order.whatsapp) },
        { key: "platform", header: "Plataforma", render: (order: (typeof rows)[number]) => (
          <PlatformName platform={order.platformName || order.platformId} size="table" />
        ) },
        { key: "plan", header: "Plan", render: (order: (typeof rows)[number]) => order.planName },
        { key: "amount", header: "Monto", render: (order: (typeof rows)[number]) => formatCurrency(order.amount) },
        { key: "status", header: "Estado", render: (order: (typeof rows)[number]) => <StatusBadge status={order.status} /> },
        {
          key: "date",
          header: "Fecha",
          render: (order: (typeof rows)[number]) => (
            <span>
              {formatDate(order.createdAt)}
              {showDeliveryTime && order.deliveredAt ? (
                <span className="mt-0.5 block text-xs text-[#34D399]">
                  Entrega {formatDateTime(order.deliveredAt)}
                </span>
              ) : null}
            </span>
          ),
        },
        {
          key: "action",
          header: "Acciones",
          render: (order: (typeof rows)[number]) => (
            <Button
              href={actionHref ? orderActionHref(actionHref, order.id) : undefined}
              variant="ghost"
              className="h-8 px-3 py-1 text-xs"
            >
              Ver
            </Button>
          ),
        },
      ]}
    />
  );
}
