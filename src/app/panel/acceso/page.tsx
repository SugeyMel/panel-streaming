import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { LookupStatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatDate } from "@/lib/format";
import { CURRENT_SELLER_ID } from "@/lib/session";
import { getCustomer, getPlatform, sellerEmailLookups } from "@/lib/selectors";

export default function SellerAccessPage() {
  return (
    <div>
      <PageHeader
        title="Centro de acceso"
        description="Historial de consultas. No se registran códigos, tokens ni contenido del correo."
      />
      <Card>
        <DataTable
          rows={sellerEmailLookups(CURRENT_SELLER_ID)}
          columns={[
            { key: "c", header: "Cliente", render: (row) => getCustomer(row.customerId)?.name ?? "—" },
            { key: "p", header: "Plataforma", render: (row) => (
              <PlatformName platform={getPlatform(row.platformId) ?? row.platformId} size="table" />
            ) },
            { key: "s", header: "Servicio", render: (row) => row.subscriptionId },
            { key: "d", header: "Fecha", render: (row) => formatDate(row.createdAt) },
            { key: "r", header: "Resultado", render: (row) => <LookupStatusBadge status={row.result} /> },
          ]}
        />
      </Card>
    </div>
  );
}
