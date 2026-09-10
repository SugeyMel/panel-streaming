"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { purchaseWholesaleAction } from "@/app/actions/business";
import {
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  MonitorIcon,
  PlayIcon,
  ShoppingBagIcon,
  StarIcon,
  UserIcon,
} from "@/components/icons";
import { WholesaleCover } from "@/components/panel/WholesaleProductImage";
import { formatStorePrice } from "@/lib/store-catalog";
import type { Platform, WholesaleCatalogProduct } from "@/lib/types";
import {
  wholesaleCatalogCopy,
  wholesalePricing,
  type WholesaleFeatureKey,
} from "@/lib/wholesale";

const featureIcons: Record<WholesaleFeatureKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  account: UserIcon,
  devices: MonitorIcon,
  pin: CheckCircleIcon,
  quality: PlayIcon,
  content: GlobeIcon,
  resale: CheckIcon,
};

const purpleBtn =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50";

export function SellerWholesaleCatalog({
  products,
  platforms,
  initialProductId,
}: {
  products: WholesaleCatalogProduct[];
  platforms: Platform[];
  initialProductId?: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(initialProductId || null);
  const [message, setMessage] = useState<string | null>(null);
  const open = products.find((item) => item.id === openId) ?? null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#253047] px-4 py-10 text-center text-sm text-[#94A3B8]">
          Aún no hay productos mayoristas publicados.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @xl:grid-cols-3">
          {products.map((product) => (
            <WholesalePreviewCard
              key={product.id}
              product={product}
              platform={platforms.find((item) => item.id === product.platformId) ?? null}
              onDetails={() => {
                setMessage(null);
                setOpenId(product.id);
              }}
            />
          ))}
        </div>
      )}
      {open ? (
        <WholesaleDetailsSheet
          product={open}
          platform={platforms.find((item) => item.id === open.platformId) ?? null}
          onClose={() => setOpenId(null)}
          onBought={(text) => {
            setMessage(text);
            setOpenId(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function WholesalePreviewCard({
  product,
  platform,
  onDetails,
}: {
  product: WholesaleCatalogProduct;
  platform: Platform | null;
  onDetails: () => void;
}) {
  const pricing = wholesalePricing(product);
  const copy = wholesaleCatalogCopy(product.offerKind, product.description);
  const out = product.available <= 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#253047] bg-[#0B111C]">
      <div className="relative">
        <WholesaleCover imageUrl={product.imageUrl} platform={platform} name={product.name} className="h-36 @lg:h-40" />
        <span className="absolute top-2.5 right-2.5 rounded-full bg-[#E50914] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
          {copy.badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <h2 className="text-[17px] leading-tight font-bold text-white">{product.name}</h2>
        <p className="mt-0.5 text-[12px] leading-snug text-[#94A3B8]">{copy.subtitle}</p>
        <ul className="mt-3 space-y-1.5">
          {copy.features.map((item) => {
            const Icon = featureIcons[item.key];
            return (
              <li key={item.key} className="flex items-center gap-2 text-[12px] text-[#E2E8F0]">
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                {item.label}
              </li>
            );
          })}
        </ul>
        <div className="mt-auto pt-3">
          <p className="text-[11px] text-[#94A3B8]">Desde</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-[26px] leading-none font-bold text-white">{formatStorePrice(pricing.fromPrice)}</p>
            {pricing.hasPackDeal ? (
              <span className="rounded-lg bg-[#E50914] px-2 py-1 text-[10px] leading-tight font-semibold text-white">
                Precio por unidad alquilando {pricing.bulkQty}
              </span>
            ) : null}
          </div>
          {out ? <p className="mt-1 text-[11px] text-[#F87171]">Sin stock</p> : null}
          <button type="button" className={`${purpleBtn} mt-3`} onClick={onDetails}>
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  );
}

function WholesaleDetailsSheet({
  product,
  platform,
  onClose,
  onBought,
}: {
  product: WholesaleCatalogProduct;
  platform: Platform | null;
  onClose: () => void;
  onBought: (text: string) => void;
}) {
  const pricing = wholesalePricing(product);
  const copy = wholesaleCatalogCopy(product.offerKind, product.description);
  const [pack, setPack] = useState<"unit" | "bulk">(pricing.hasPackDeal ? "bulk" : "unit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qty = pack === "bulk" ? pricing.bulkQty : 1;
  const unitCost = pack === "bulk" ? pricing.packUnitPrice : pricing.unitPrice;
  const total = unitCost * qty;
  const out = product.available < qty;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Cerrar" onClick={onClose} />
      <div className="relative z-10 flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#253047] bg-[#0B111C] sm:max-w-md sm:rounded-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative">
            <WholesaleCover imageUrl={product.imageUrl} platform={platform} name={product.name} className="h-32" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white"
              aria-label="Cerrar"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pt-3 pb-4">
            <h2 className="text-lg font-bold text-white">{product.name}</h2>
            <p className="mt-0.5 text-[12px] text-[#94A3B8]">{copy.subtitle}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {copy.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#334155] px-2.5 py-0.5 text-[11px] text-[#CBD5E1]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">Precios</h3>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => setPack("unit")}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ${
                  pack === "unit" ? "border-2 border-white/70 bg-[#151C2A]" : "border border-[#2A3548] bg-[#111827]"
                }`}
              >
                <span>
                  <span className="block text-[13px] font-semibold text-white">1 unidad</span>
                  <span className="block text-[11px] text-[#94A3B8]">Precio por cuenta</span>
                </span>
                <span className="text-[15px] font-bold text-white">{formatStorePrice(pricing.unitPrice)}</span>
              </button>
              {pricing.hasPackDeal ? (
                <button
                  type="button"
                  onClick={() => setPack("bulk")}
                  className={`relative flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ${
                    pack === "bulk"
                      ? "border-2 border-[#E50914] bg-[#1A0B0D]"
                      : "border border-[#2A3548] bg-[#111827]"
                  }`}
                >
                  <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-md bg-[#E50914] px-2 py-0.5 text-[10px] font-bold text-white">
                    <StarIcon className="h-3 w-3" /> Mejor precio
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-white">{pricing.bulkQty} unidades</span>
                    <span className="block text-[11px] text-[#94A3B8]">
                      Debes alquilar {pricing.bulkQty} unidades
                    </span>
                  </span>
                  <span className="text-right text-[15px] font-bold text-white">
                    {formatStorePrice(pricing.packUnitPrice)}
                    <span className="block text-[10px] font-medium text-[#94A3B8]">por unidad</span>
                  </span>
                </button>
              ) : null}
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">Condiciones</h3>
            <ul className="mt-2 space-y-1.5 rounded-xl bg-[#111827] px-3.5 py-3 text-[12px] leading-snug text-[#CBD5E1]">
              {pricing.hasPackDeal ? (
                <>
                  <li>• El {formatStorePrice(pricing.packUnitPrice)} aplica solo al alquilar {pricing.bulkQty} unidades.</li>
                  <li>• Debes tomar y pagar las {pricing.bulkQty} unidades.</li>
                  <li>• No se alquila 1 unidad al precio de {formatStorePrice(pricing.packUnitPrice)}.</li>
                  <li>• 1 unidad sale a {formatStorePrice(pricing.unitPrice)}.</li>
                </>
              ) : (
                <li>• Precio por unidad: {formatStorePrice(pricing.unitPrice)}.</li>
              )}
              <li>• Cuentas originales y funcionales.</li>
              <li>• Entrega inmediata según stock disponible.</li>
            </ul>
            {error ? <p className="mt-3 text-sm text-[#F87171]">{error}</p> : null}
          </div>
        </div>
        <div className="border-t border-[#253047] bg-[#0B111C] px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 text-center text-[12px] text-[#94A3B8]">
            Total {formatStorePrice(total)}
            {qty > 1 ? ` · ${qty} × ${formatStorePrice(unitCost)}` : ""}
            {out ? " · Sin stock suficiente" : ""}
          </p>
          <button
            type="button"
            disabled={pending || out}
            className={purpleBtn}
            onClick={async () => {
              setPending(true);
              setError(null);
              const formData = new FormData();
              formData.set("supplierProductId", product.id);
              formData.set("pack", pack);
              const result = await purchaseWholesaleAction(formData);
              setPending(false);
              if (!result.ok) {
                setError(result.error ?? "No se pudo completar la compra.");
                return;
              }
              onBought(
                qty > 1
                  ? `Compra registrada: ${qty} unidades a ${formatStorePrice(unitCost)} c/u.`
                  : `Compra registrada: 1 unidad a ${formatStorePrice(unitCost)}.`,
              );
            }}
          >
            <ShoppingBagIcon className="h-4 w-4" />
            {pending ? "Procesando…" : "Comprar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}
