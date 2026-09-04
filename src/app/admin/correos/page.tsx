import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmailStatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { connectedEmails, emailAuditLogs } from "@/data/mock";
import { formatDate } from "@/lib/format";
import { getSeller } from "@/lib/selectors";

export default function AdminEmailsPage() {
  return (
    <div>
      <PageHeader
        title="Correos"
        description="Supervisión global de cuentas conectadas. No se muestra contenido de mensajes."
      />
      <Card>
        <DataTable
          rows={connectedEmails}
          columns={[
            { key: "seller", header: "Vendedor", render: (row) => getSeller(row.sellerId)?.name ?? "—" },
            { key: "email", header: "Correo", render: (row) => row.email },
            { key: "provider", header: "Proveedor", render: (row) => (row.provider === "google" ? "Google" : "Microsoft") },
            { key: "status", header: "Estado", render: (row) => <EmailStatusBadge status={row.status} /> },
            {
              key: "sync",
              header: "Última sincronización",
              render: (row) => (row.lastSyncAt ? formatDate(row.lastSyncAt) : "—"),
            },
            {
              key: "lookups",
              header: "Consultas",
              render: (row) =>
                emailAuditLogs.filter((item) => item.sellerId === row.sellerId).length,
            },
          ]}
        />
      </Card>
    </div>
  );
}
