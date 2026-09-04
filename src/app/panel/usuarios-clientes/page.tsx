"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/StatusBadge";
import { customerAccounts } from "@/data/mock";
import { formatDate } from "@/lib/format";
import { CURRENT_SELLER_ID } from "@/lib/session";
import { getCustomer } from "@/lib/selectors";

export default function SellerCustomerUsersPage() {
  const [open, setOpen] = useState(false);
  const rows = customerAccounts.filter((item) => item.sellerId === CURRENT_SELLER_ID);

  return (
    <div>
      <PageHeader
        title="Usuarios de clientes"
        description="El vendedor crea el acceso. No necesita conocer la contraseña final."
        action={<Button onClick={() => setOpen(true)}>+ Crear acceso</Button>}
      />
      <Card>
        <DataTable
          rows={rows}
          columns={[
            { key: "c", header: "Cliente", render: (row) => getCustomer(row.customerId)?.name ?? "—" },
            { key: "n", header: "Nombre", render: (row) => row.name },
            { key: "e", header: "Correo", render: (row) => row.email },
            { key: "w", header: "WhatsApp", render: (row) => row.whatsapp },
            {
              key: "s",
              header: "Estado",
              render: (row) => (
                <Badge tone={row.status === "activo" ? "success" : "warning"}>{row.status}</Badge>
              ),
            },
            {
              key: "a",
              header: "Último acceso",
              render: (row) => (row.lastAccessAt ? formatDate(row.lastAccessAt) : "Nunca"),
            },
            {
              key: "x",
              header: "Acciones",
              render: () => (
                <Button variant="ghost" className="h-8 px-3 py-1 text-xs">
                  Reenviar
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={open} title="Crear acceso" onClose={() => setOpen(false)}>
        <p className="text-sm text-slate-400">
          El cliente definirá su contraseña más adelante. Aquí solo se invita por correo o WhatsApp.
        </p>
      </Modal>
    </div>
  );
}
