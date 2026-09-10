"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertProductAction } from "@/app/actions/business";
import { SellerStore } from "@/components/store/SellerStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { platformDisplayName } from "@/lib/platform-logos";
import { PRODUCT_TERMS, type ProductOffer } from "@/lib/selectors";
import type { Platform, Product, Seller, StreamingAccount } from "@/lib/types";
import type { StoreOfferLink } from "@/lib/data/queries";

function draftPrice(offer: ProductOffer | null, days: number) {
  if (!offer) return "";
  const match =
    offer.variants.find((item) => item.durationDays === days) ??
    offer.variants.find((item) => Math.abs(item.durationDays - days) <= 5);
  return match ? String(match.salePrice) : "";
}

export function ProductsManager({
  seller,
  products,
  platforms,
  accounts = [],
  offerLinks = [],
}: {
  seller: Seller;
  products: Product[];
  platforms: Platform[];
  accounts?: StreamingAccount[];
  offerLinks?: StoreOfferLink[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductOffer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listedPlatforms = platforms.filter((item) => item.available);
  const [formPlatformId, setFormPlatformId] = useState(listedPlatforms[0]?.id ?? "");
  const formPlatform = platforms.find((item) => item.id === formPlatformId) ?? listedPlatforms[0];
  const formName = editing?.name || platformDisplayName(formPlatform);

  function openCreate() {
    setEditing(null);
    setFormPlatformId(listedPlatforms[0]?.id ?? "");
    setOpen(true);
  }

  function openEdit(offer: ProductOffer) {
    setEditing(offer);
    setFormPlatformId(offer.platformId);
    setOpen(true);
  }

  return (
    <div className="-mx-4 -mt-2 sm:-mx-6 lg:-mx-8 lg:-mt-2">
      {message ? <p className="px-4 pt-3 text-sm text-cyan-300">{message}</p> : null}
      <SellerStore
        seller={seller}
        products={products}
        platforms={platforms}
        showPublicChrome={false}
        manageMode
        onCreate={openCreate}
        onManageOffer={openEdit}
      />
      <Modal open={open} title={editing ? "Editar producto" : "Nuevo producto"} onClose={() => setOpen(false)}>
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
          <p className="text-[11px] leading-snug text-[#64748B]">
            La imagen ya está en Mayorista → Plataformas. Elige el servicio; no tienes que subir foto.
          </p>
          <input type="hidden" name="platformId" value={formPlatformId} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {listedPlatforms.map((item) => {
              const selected = item.id === formPlatformId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormPlatformId(item.id)}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm ${
                    selected
                      ? "border-[#7C3AED] bg-[#7C3AED]/15 text-white"
                      : "border-white/10 bg-white/5 text-[#E2E8F0]"
                  }`}
                >
                  <PlatformLogo platform={item} size={28} />
                  <span className="truncate">{platformDisplayName(item)}</span>
                </button>
              );
            })}
          </div>
          {formPlatform ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#253047] bg-[#0B111C] px-3 py-2">
              <PlatformLogo platform={formPlatform} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{platformDisplayName(formPlatform)}</p>
                <p className="truncate text-[11px] text-[#94A3B8]">{formPlatform.tagline || "Este logo sale en tu tienda y lo ven tus clientes."}</p>
              </div>
            </div>
          ) : null}
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
          <label className="block text-xs text-slate-400">Stock {editing?.inventoryLinked ? "(lo calcula el inventario asociado)" : ""}</label>
          <input
            name="stock"
            type="number"
            defaultValue={editing?.stock ?? ""}
            placeholder="Stock"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            disabled={Boolean(editing?.inventoryLinked)}
          />
          {editing?.inventoryLinked ? <input type="hidden" name="stock" value={String(editing.stock ?? 0)} /> : null}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="hidden" name="onOffer" value="false" />
            <input type="checkbox" name="onOffer" value="true" defaultChecked={Boolean(editing?.onOffer)} />
            En oferta
          </label>
          <label className="block text-xs text-slate-400">Precio anterior (tachado, opcional)</label>
          <input
            name="compareAtPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={editing?.compareAtPrice ?? ""}
            placeholder="Vacío = sin tachado"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          />
          <input type="hidden" name="syncAccounts" value="1" />
          <div>
            <p className="text-xs text-slate-400">Inventario asociado (misma plataforma)</p>
            <p className="mt-1 text-[11px] text-slate-500">No crea cuentas. Solo enlaza las que ya registraste.</p>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-2">
              {accounts.filter((item) => item.platformId === formPlatformId).length === 0 ? (
                <p className="text-xs text-slate-500">No hay cuentas de esta plataforma en inventario.</p>
              ) : (
                accounts
                  .filter((item) => item.platformId === formPlatformId)
                  .map((item) => {
                    const checked = Boolean(
                      editing &&
                        offerLinks.some(
                          (link) =>
                            link.accountId === item.id &&
                            link.platformId === editing.platformId &&
                            link.productName.toLowerCase() === editing.name.toLowerCase(),
                        ),
                    );
                    return (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-slate-200">
                        <input type="checkbox" name="accountId" value={item.id} defaultChecked={checked} />
                        <span className="truncate">
                          {item.label || item.email} · {item.maxProfiles - item.usedProfiles} libres
                        </span>
                      </label>
                    );
                  })
              )}
            </div>
          </div>
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
