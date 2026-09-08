import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { whatsappParaMostrar } from "@/lib/clientes";
import type { CustomerRow } from "@/lib/selectors";

export function CustomerTable({
  rows,
  showSeller = false,
  hrefFor,
  onEdit,
}: {
  rows: CustomerRow[];
  showSeller?: boolean;
  hrefFor?: (row: CustomerRow) => string;
  onEdit?: (row: CustomerRow) => void;
}) {
  return (
    <DataTable
      rows={rows}
      columns={[
        {
          key: "name",
          header: "Cliente",
          render: (row) => <span className="font-medium text-white">{row.name}</span>,
        },
        ...(showSeller
          ? [{ key: "seller", header: "Vendedor", render: (row: CustomerRow) => row.sellerName ?? "—" }]
          : []),
        { key: "whatsapp", header: "WhatsApp", render: (row: CustomerRow) => whatsappParaMostrar(row.whatsapp) },
        { key: "email", header: "Correo", render: (row: CustomerRow) => row.email },
        { key: "active", header: "Servicios activos", render: (row: CustomerRow) => row.activeServices },
        { key: "expired", header: "Servicios vencidos", render: (row: CustomerRow) => row.expiredServices },
        {
          key: "next",
          header: "Próximo vencimiento",
          render: (row: CustomerRow) => (row.nextExpiry ? formatDate(row.nextExpiry) : "—"),
        },
        {
          key: "total",
          header: "Total compras",
          render: (row: CustomerRow) => formatCurrency(row.totalPurchases),
        },
        {
          key: "last",
          header: "Última compra",
          render: (row: CustomerRow) => (row.lastPurchase ? formatDate(row.lastPurchase) : "—"),
        },
        {
          key: "status",
          header: "Estado",
          render: (row: CustomerRow) => (
            <CustomerStatusBadge status={row.status} />
          ),
        },
        {
          key: "actions",
          header: "Acciones",
          render: (row: CustomerRow) => (
            <div className="flex gap-2">
              <Button href={hrefFor?.(row)} variant="ghost" className="h-8 px-3 py-1 text-xs">
                Ver
              </Button>
              {onEdit ? (
                <Button variant="ghost" className="h-8 px-3 py-1 text-xs" onClick={() => onEdit(row)}>
                  Editar
                </Button>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
