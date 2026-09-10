import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { LookupStatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatDate } from "@/lib/format";
import { loadCustomers, loadEmailLookups, loadPlatforms, panelScope } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function SellerAccessPage() {
  const { sellerId } = await panelScope();
  const [lookups, customers, platforms] = await Promise.all([
    loadEmailLookups(sellerId),
    loadCustomers(sellerId),
    loadPlatforms(),
  ]);

  return (
    <div>
      <PageHeader
        title="Centro de acceso"
        description="Historial de consultas de códigos. No se registran códigos ni el contenido del correo."
      />
      <Card>
        <DataTable
          rows={lookups}
          empty="Todavía no hay consultas de códigos."
          columns={[
            {
              key: "c",
              header: "Cliente",
              render: (row) => customers.find((item) => item.id === row.customerId)?.name ?? "—",
            },
            {
              key: "p",
              header: "Plataforma",
              render: (row) => {
                const platform = platforms.find((item) => item.id === row.platformId);
                return <PlatformName platform={platform ?? row.platformId} size="table" />;
              },
            },
            { key: "d", header: "Fecha", render: (row) => formatDate(row.createdAt) },
            { key: "r", header: "Resultado", render: (row) => <LookupStatusBadge status={row.result} /> },
          ]}
        />
      </Card>
    </div>
  );
}
