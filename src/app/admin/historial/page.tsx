"use client";

import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AuditLog } from "@/lib/types";
import { formatDate } from "@/lib/format";

// La tabla (DataTable) funciona en el navegador, por eso esta página también.
// Sin ejemplos: el historial empieza vacío.
const auditLogs: AuditLog[] = [];

export default function AdminHistoryPage() {
  return (
    <div>
      <PageHeader
        title="Historial"
        description="Auditoría visual de acciones. Más adelante se persistirá en base de datos."
      />
      <Card>
        <DataTable
          rows={auditLogs}
          columns={[
            { key: "user", header: "Usuario", render: (row) => row.userName },
            { key: "role", header: "Rol", render: (row) => row.role },
            { key: "action", header: "Acción", render: (row) => row.action },
            { key: "entity", header: "Entidad", render: (row) => row.entity },
            { key: "date", header: "Fecha", render: (row) => formatDate(row.createdAt) },
            { key: "result", header: "Resultado", render: (row) => row.result },
          ]}
        />
      </Card>
    </div>
  );
}
