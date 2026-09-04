import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SupportStatusBadge } from "@/components/ui/StatusBadge";
import { sellerSupport } from "@/data/mock";
import { formatDate } from "@/lib/format";
import { getCustomer, getPlatform, getSeller } from "@/lib/selectors";
import { PlatformName } from "@/components/ui/PlatformLogo";

export default function AdminRequestsPage() {
  return (
    <div>
      <PageHeader
        title="Solicitudes"
        description="Pedidos de ayuda de vendedores hacia el administrador."
      />
      <Card>
        <DataTable
          rows={sellerSupport}
          columns={[
            { key: "seller", header: "Vendedor", render: (row) => getSeller(row.sellerId)?.name ?? "—" },
            { key: "platform", header: "Plataforma", render: (row) => (
              <PlatformName platform={getPlatform(row.platformId ?? "") ?? row.platformId ?? ""} size="table" />
            ) },
            { key: "customer", header: "Cliente", render: (row) => getCustomer(row.customerId ?? "")?.name ?? "—" },
            { key: "type", header: "Tipo", render: (row) => row.type },
            { key: "desc", header: "Descripción", render: (row) => row.description },
            { key: "status", header: "Estado", render: (row) => <SupportStatusBadge status={row.status} /> },
            { key: "date", header: "Fecha", render: (row) => formatDate(row.createdAt) },
          ]}
        />
      </Card>
    </div>
  );
}
