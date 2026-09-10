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
import { canonicalPlatformName } from "@/lib/platform-logos";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { Badge } from "@/components/ui/StatusBadge";
import type { Platform } from "@/lib/types";

export function PlatformsManager({ platforms, embedded = false }: { platforms: Platform[]; embedded?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createButton = (
    <Button className="w-full @lg:w-auto" onClick={() => { setEditing(null); setOpen(true); }}>
      Crear plataforma
    </Button>
  );

  return (
    <div className="@container min-w-0 space-y-4">
      {embedded ? (
        <div className="flex @lg:justify-end">{createButton}</div>
      ) : (
        <PageHeader
          title="Plataformas"
          description="Catálogo maestro. Cada vendedor decide cuáles vender y a qué precio."
          action={createButton}
        />
      )}
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <DataTable
          rows={platforms}
          empty="Aún no hay plataformas."
          mobileRender={(row) => (
            <article className="rounded-2xl border border-[#253047] bg-[#0B111C] p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <PlatformName platform={row} size="table" />
                  {row.tagline ? (
                    <p className="mt-1 truncate text-[11px] text-[#94A3B8]">{row.tagline}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge tone={row.available ? "success" : "warning"}>
                    {row.available ? "Disponible" : "Oculta"}
                  </Badge>
                  <Button
                    variant="ghost"
                    className="h-8 !min-h-8 px-2 text-xs"
                    onClick={() => {
                      setEditing(row);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </article>
          )}
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
          <input name="name" defaultValue={editing ? canonicalPlatformName(editing) || editing.name : ""} placeholder="Nombre" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="slug" defaultValue={editing?.slug} placeholder="slug" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="tagline" defaultValue={editing?.tagline} placeholder="Descripción" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <PlatformLogoField platform={editing} />
          <PlatformLogoField platform={editing} kind="clientes" />
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
