"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertPlatformAction } from "@/app/actions/business";
import { PlatformLogoField } from "@/components/admin/PlatformLogoField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { Badge } from "@/components/ui/StatusBadge";
import type { Platform } from "@/lib/types";

export function PlatformsManager({ platforms }: { platforms: Platform[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plataformas"
        description="Catálogo maestro. Cada vendedor decide cuáles vender y a qué precio."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}>Crear plataforma</Button>}
      />
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <DataTable
          rows={platforms}
          columns={[
            { key: "name", header: "Plataforma", render: (row) => (
              <PlatformName platform={row} size="table" />
            ) },
            { key: "tagline", header: "Descripción", render: (row) => row.tagline },
            {
              key: "status",
              header: "Estado",
              render: (row) => (
                <Badge tone={row.available ? "success" : "warning"}>
                  {row.available ? "Disponible" : "Oculta"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <Button variant="ghost" className="h-8 px-3 py-1 text-xs" onClick={() => { setEditing(row); setOpen(true); }}>
                  Editar
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={open} title={editing ? "Editar plataforma" : "Crear plataforma"} onClose={() => setOpen(false)}>
        <form
          key={editing?.id ?? "new"}
          className="space-y-3"
          action={async (formData) => {
            if (editing) formData.set("id", editing.id);
            const result = await upsertPlatformAction(formData);
            setMessage(result.ok ? "Guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setOpen(false);
              router.refresh();
            }
          }}
        >
          <input name="name" defaultValue={editing?.name} placeholder="Nombre" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="slug" defaultValue={editing?.slug} placeholder="slug" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="tagline" defaultValue={editing?.tagline} placeholder="Descripción" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <PlatformLogoField platform={editing} />
          <select name="available" defaultValue={editing?.available === false ? "false" : "true"} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="true">Disponible</option>
            <option value="false">Oculta</option>
          </select>
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
