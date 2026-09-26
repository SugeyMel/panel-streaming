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
import { adminWhatsappLink } from "@/lib/admin-contact";
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
const purpleBtnCompact =
  "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] text-[11px] font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50";

export function SellerWholesaleCatalog({
  products,
  platforms,
  initialProductId,
  compact = false,
  adminWhatsapp,
}: {
  products: WholesaleCatalogProduct[];
  platforms: Platform[];
  initialProductId?: string;
  /** WhatsApp del administrador: "Comprar ahora" abre el chat con el pedido en vez de registrar la compra. */
  adminWhatsapp?: string;
  /** Tarjetas más pequeñas en cuadrícula de 3 columnas (pantalla Consultas). */
  compact?: boolean;
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
        <div
          className={
            compact
              ? "grid grid-cols-1 gap-2.5 @min-[340px]:grid-cols-2 @min-[480px]:grid-cols-3"
              : "grid grid-cols-1 gap-3 @md:grid-cols-2 @xl:grid-cols-3"
          }
        >
          {products.map((product) =>
            compact ? (
              <WholesaleSquareCard
                key={product.id}
                product={product}
                platform={platforms.find((item) => item.id === product.platformId) ?? null}
                onDetails={() => {
                  setMessage(null);
                  setOpenId(product.id);
                }}
              />
            ) : (
            <WholesalePreviewCard
              key={product.id}
              product={product}
              platform={platforms.find((item) => item.id === product.platformId) ?? null}
              compact={compact}
              onDetails={() => {
                setMessage(null);
                setOpenId(product.id);
              }}
            />
            ),
          )}
        </div>
      )}
      {open ? (
        <WholesaleDetailsSheet
          product={open}
          platform={platforms.find((item) => item.id === open.platformId) ?? null}
          adminWhatsapp={adminWhatsapp}
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

/** Tarjeta cuadrada y compacta (Consultas): imagen, "👑 CUENTA COMPLETA", nombre y precio. Toda la tarjeta abre el detalle. */
function WholesaleSquareCard({
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
    <button
      type="button"
      onClick={onDetails}
      aria-label={`Ver detalles de ${product.name}`}
      className="group relative block w-full overflow-hidden rounded-2xl border border-[#253047] bg-[#0B111C] text-left transition hover:border-[#7C3AED]/70 hover:shadow-[0_0_0_1px_rgba(124,58,237,0.35)] focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
    >
      <div className="relative aspect-[16/10] @min-[340px]:aspect-square">
        <WholesaleCover
          imageUrl={product.imageUrl}
          platform={platform}
          name={product.name}
          className={`h-full transition duration-300 group-hover:scale-[1.03] ${out ? "opacity-50 grayscale" : ""}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
        <span className="absolute top-2 right-2 rounded-full bg-[#E50914] px-2 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow">
          👑 {copy.badge}
        </span>
        {out ? (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#F87171]/60 bg-black/75 px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#F87171]">
            SIN STOCK
          </span>
        ) : null}
        <div className="absolute inset-x-2 bottom-2">
          <p className="truncate text-center text-[11px] font-bold tracking-wide text-white uppercase drop-shadow">
            {product.name}
          </p>
          <p className="mt-1 rounded-xl border border-[#7C3AED] bg-[#0B111C]/85 py-1 text-center text-[17px] leading-tight font-bold text-white">
            {formatStorePrice(pricing.fromPrice)}
          </p>
        </div>
      </div>
    </button>
  );
}

function WholesalePreviewCard({
  product,
  platform,
  onDetails,
  compact = false,
}: {
  product: WholesaleCatalogProduct;
  platform: Platform | null;
  onDetails: () => void;
  compact?: boolean;
}) {
  const pricing = wholesalePricing(product);
  const copy = wholesaleCatalogCopy(product.offerKind, product.description);
  const out = product.available <= 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#253047] bg-[#0B111C]">
      <div className="relative">
        <WholesaleCover
          imageUrl={product.imageUrl}
          platform={platform}
          name={product.name}
          className={compact ? "h-20" : "h-36 @lg:h-40"}
        />
        <span
          className={`absolute rounded-full bg-[#E50914] font-bold tracking-wide text-white uppercase ${
            compact ? "top-1.5 right-1.5 px-1.5 py-px text-[8px]" : "top-2.5 right-2.5 px-2.5 py-0.5 text-[10px]"
          }`}
        >
          {copy.badge}
        </span>
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "px-2.5 pt-2 pb-2.5" : "px-3.5 pt-3 pb-3.5"}`}>
        <h2 className={`leading-tight font-bold text-white ${compact ? "text-[13px]" : "text-[17px]"}`}>{product.name}</h2>
        <p className={`mt-0.5 leading-snug text-[#94A3B8] ${compact ? "text-[10px]" : "text-[12px]"}`}>{copy.subtitle}</p>
        <ul className={compact ? "mt-2 space-y-1" : "mt-3 space-y-1.5"}>
          {copy.features.map((item) => {
            const Icon = featureIcons[item.key];
            return (
              <li
                key={item.key}
                className={`flex items-center text-[#E2E8F0] ${compact ? "gap-1.5 text-[10px]" : "gap-2 text-[12px]"}`}
              >
                <Icon className={`shrink-0 text-[#94A3B8] ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
                {item.label}
              </li>
            );
          })}
        </ul>
        <div className={`mt-auto ${compact ? "pt-2" : "pt-3"}`}>
          <p className={`text-[#94A3B8] ${compact ? "text-[9px]" : "text-[11px]"}`}>Desde</p>
          <div className={`mt-0.5 flex flex-wrap items-center ${compact ? "gap-1" : "gap-2"}`}>
            <p className={`leading-none font-bold text-white ${compact ? "text-[18px]" : "text-[26px]"}`}>{formatStorePrice(pricing.fromPrice)}</p>
            {pricing.hasPackDeal ? (
              <span
                className={`rounded-lg bg-[#E50914] leading-tight font-semibold text-white ${
                  compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[10px]"
                }`}
              >
                Precio por unidad alquilando {pricing.bulkQty}
              </span>
            ) : null}
          </div>
          {out ? <p className={`mt-1 text-[#F87171] ${compact ? "text-[9px]" : "text-[11px]"}`}>Sin stock</p> : null}
          <button type="button" className={`${compact ? purpleBtnCompact : purpleBtn} ${compact ? "mt-2" : "mt-3"}`} onClick={onDetails}>
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
  adminWhatsapp,
  onClose,
  onBought,
}: {
  product: WholesaleCatalogProduct;
  platform: Platform | null;
  adminWhatsapp?: string;
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
            <WholesaleCover imageUrl={product.imageUrl} platform={platform} name={product.name} className="h-44" />
            <span className="absolute top-2.5 left-2.5 rounded-full bg-[#E50914] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
              👑 {copy.badge}
            </span>
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
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-white">{product.name}</h2>
              <p className="shrink-0 text-lg font-bold text-white">{formatStorePrice(pricing.fromPrice)}</p>
            </div>
            {product.description?.trim() ? null : (
              <p className="mt-0.5 text-[12px] text-[#94A3B8]">{copy.subtitle}</p>
            )}
            <p
              className={`mt-2 inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                product.available > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-[#F87171]"
              }`}
            >
              {product.available > 0 ? `Stock disponible: ${product.available}` : "SIN STOCK"}
            </p>
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

            {product.description?.trim() ? (
              <>
                <h3 className="mt-4 text-sm font-semibold text-white">Descripción</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed whitespace-pre-line text-[#CBD5E1]">
                  {product.description.trim()}
                </p>
              </>
            ) : null}

            {copy.features.length ? (
              <>
                <h3 className="mt-4 text-sm font-semibold text-white">Características</h3>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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
              </>
            ) : null}

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
              if (adminWhatsapp) {
                // Se abre el WhatsApp del administrador con el pedido listo; el administrador confirma el pago y la entrega.
                const text =
                  `Hola, quiero comprar: ${product.name}\n` +
                  (qty > 1
                    ? `Cantidad: ${qty} unidades a ${formatStorePrice(unitCost)} c/u\n`
                    : `Cantidad: 1 unidad a ${formatStorePrice(unitCost)}\n`) +
                  `Total: ${formatStorePrice(total)}`;
                window.open(adminWhatsappLink(adminWhatsapp, text), "_blank", "noopener,noreferrer");
                return;
              }
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
            {pending ? "Procesando…" : adminWhatsapp ? "Comprar por WhatsApp" : "Comprar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}
