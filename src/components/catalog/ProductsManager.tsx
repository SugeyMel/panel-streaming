"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertProductAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { Badge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { platformDisplayName } from "@/lib/platform-logos";
import { PRODUCT_TERMS, groupProductOffers, type ProductOffer } from "@/lib/selectors";
import type { Platform, Product } from "@/lib/types";

function draftPrice(offer: ProductOffer | null, days: number) {
  if (!offer) return "";
  const match =
    offer.variants.find((item) => item.durationDays === days) ??
    offer.variants.find((item) => Math.abs(item.durationDays - days) <= 5);
  return match ? String(match.salePrice) : "";
}

function listedPrice(offer: ProductOffer, days: number) {
  const match =
    offer.variants.find((item) => item.durationDays === days && item.active) ??
    offer.variants.find((item) => item.active && Math.abs(item.durationDays - days) <= 5);
  return match ? formatCurrency(match.salePrice) : "—";
}

export function ProductsManager({
  products,
  platforms,
}: {
  products: Product[];
  platforms: Platform[];
}) {
  const router = useRouter();
  const offers = groupProductOffers(products);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductOffer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listedPlatforms = platforms.filter((item) => item.available);
  const [formPlatformId, setFormPlatformId] = useState(listedPlatforms[0]?.id ?? "");
  const formPlatform = platforms.find((item) => item.id === formPlatformId) ?? listedPlatforms[0];
  const formName = editing?.name || platformDisplayName(formPlatform);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Productos"
        description="Un producto, cuatro precios opcionales (1, 3, 6 y 12 meses). Esos mismos montos se usan al comprar y al renovar."
        action={<Button onClick={() => { setEditing(null); setFormPlatformId(listedPlatforms[0]?.id ?? ""); setOpen(true); }}>Crear producto</Button>}
      />
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <DataTable
          rows={offers}
          columns={[
            { key: "platform", header: "Plataforma", render: (row) => (
              <PlatformName
                platform={platforms.find((item) => item.id === row.platformId) ?? row.platformId}
                size="table"
              />
            ) },
            { key: "cost", header: "Costo interno", render: (row) => formatCurrency(row.internalCost) },
            { key: "p1", header: "1 mes", render: (row) => listedPrice(row, 30) },
            { key: "p3", header: "3 meses", render: (row) => listedPrice(row, 90) },
            { key: "p6", header: "6 meses", render: (row) => listedPrice(row, 180) },
            { key: "p12", header: "12 meses", render: (row) => listedPrice(row, 365) },
            {
              key: "status",
              header: "Estado",
              render: (row) => <Badge tone={row.active ? "success" : "warning"}>{row.active ? "Activo" : "Inactivo"}</Badge>,
            },
            { key: "stock", header: "Stock", render: (row) => row.stock },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <Button variant="ghost" className="h-8 px-3 py-1 text-xs" onClick={() => { setEditing(row); setFormPlatformId(row.platformId); setOpen(true); }}>
                  Editar
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={open} title={editing ? "Editar producto" : "Crear producto"} onClose={() => setOpen(false)}>
        <form
          key={editing?.id ?? "new"}
          className="space-y-3"
          action={async (formData) => {
            const result = await upsertProductAction(formData);
            setMessage(result.ok ? "Guardado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setOpen(false);
              router.refresh();
            }
          }}
        >
          {editing ? (
            <>
              <input type="hidden" name="groupPlatformId" value={editing.platformId} />
              <input type="hidden" name="groupName" value={editing.name} />
            </>
          ) : null}
          <label className="block text-xs text-slate-400">Plataforma</label>
          <select
            name="platformId"
            value={formPlatformId}
            onChange={(event) => setFormPlatformId(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            {listedPlatforms.map((item) => (
              <option key={item.id} value={item.id}>{platformDisplayName(item)}</option>
            ))}
          </select>
          <input type="hidden" name="name" value={formName} />
          <label className="block text-xs text-slate-400">Descripción</label>
          <input name="description" defaultValue={editing?.description} placeholder="Ej. 1 cuenta completa" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <label className="block text-xs text-slate-400">Costo interno (lo que te cuesta a ti, opcional)</label>
          <input name="costPrice" type="number" step="0.01" min="0" defaultValue={editing?.internalCost || ""} placeholder="0" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <p className="text-xs text-slate-400">Precios de venta y renovación (opcional cada plazo)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUCT_TERMS.map((term) => (
              <label key={term.days} className="block space-y-1">
                <span className="text-xs text-slate-400">{term.label}</span>
                <input
                  name={term.field}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={draftPrice(editing, term.days)}
                  placeholder="Vacío = no ofrecer"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <label className="block text-xs text-slate-400">Stock</label>
          <input name="stock" type="number" defaultValue={editing?.stock ?? ""} placeholder="Stock" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <select name="active" defaultValue={editing?.active === false ? "false" : "true"} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
