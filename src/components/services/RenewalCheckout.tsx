"use client";

import { useMemo, useState } from "react";
import { placeRenewalCheckoutAction } from "@/app/actions/business";
import { CheckIcon, UploadIcon } from "@/components/icons";
import { SellerPayDetails } from "@/components/payments/SellerPayDetails";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformMark } from "@/components/ui/PlatformMark";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Badge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { renewalOptionsForPlatform } from "@/lib/selectors";
import type { Platform, Product, SellerPaymentMethod, Subscription } from "@/lib/types";

type Step = "plan" | "pay" | "voucher" | "done";

function savingsPercent(monthPrice: number | undefined, price: number, months: number) {
  if (!monthPrice || months <= 1) return null;
  const full = monthPrice * months;
  if (price >= full) return null;
  const pct = Math.round((1 - price / full) * 100);
  return pct > 0 ? pct : null;
}

export function RenewalCheckout({
  service,
  products,
  platform,
  methods,
}: {
  service: Subscription;
  products: Product[];
  platform?: Platform;
  methods: SellerPaymentMethod[];
}) {
  const current = products.find((item) => item.id === service.productId) ?? null;
  const fallbackProduct = useMemo(() => {
    if (current) return current;
    if (!service.productId) return null;
    return {
      id: service.productId,
      sellerId: service.sellerId,
      platformId: service.platformId,
      name: platform?.name ?? "Plan",
      description: "",
      internalCost: 0,
      salePrice: service.salePrice,
      durationDays: Math.max(30, service.durationMonths * 30),
      active: true,
      stock: 0,
      soldOut: false,
      compareAtPrice: null,
      onOffer: false,
      inventoryLinked: false,
    } satisfies Product;
  }, [current, platform?.name, service]);
  const options = useMemo(() => {
    const listed = renewalOptionsForPlatform(products, service.platformId, fallbackProduct).filter(
      (item) => item.product,
    );
    if (fallbackProduct && !listed.some((item) => item.product?.id === fallbackProduct.id)) {
      return [
        {
          months: Math.max(1, Math.round(fallbackProduct.durationDays / 30)),
          minDays: fallbackProduct.durationDays,
          maxDays: fallbackProduct.durationDays,
          label: `${fallbackProduct.durationDays} días`,
          product: fallbackProduct,
        },
        ...listed,
      ];
    }
    return listed;
  }, [products, service.platformId, fallbackProduct]);
  const defaultProductId = options.find((item) => item.product)?.product?.id ?? service.productId;
  const [step, setStep] = useState<Step>("plan");
  const [productId, setProductId] = useState(defaultProductId);
  const [paymentMethodId, setPaymentMethodId] = useState(methods.find((item) => item.isActive !== false)?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected =
    products.find((item) => item.id === productId) ??
    options.find((item) => item.product?.id === productId)?.product ??
    fallbackProduct;
  const pay = methods.find((item) => item.id === paymentMethodId);
  const monthPrice = options.find((item) => item.months === 1)?.product?.salePrice;
  const selectedOption = options.find((item) => item.product?.id === productId);

  async function submit() {
    if (!file) {
      setError("Adjunta el comprobante para enviárselo a tu vendedor.");
      return;
    }
    const planId = productId || service.productId;
    if (!planId || !paymentMethodId) {
      setError("Elige un plazo y un medio de pago.");
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("serviceId", service.id);
    form.set("productId", planId);
    form.set("paymentMethodId", paymentMethodId);
    form.set("voucher", file);
    const result = await placeRenewalCheckoutAction(form);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar");
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center text-center">
        <div className="mt-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6]">
          <CheckIcon className="h-12 w-12" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#F8FAFC]">¡Comprobante enviado!</h1>
        <p className="mt-3 max-w-sm text-sm text-[#94A3B8]">
          Tu renovación está pendiente de revisión. Te notificaremos cuando se confirme el pago.
        </p>
        <Card className="mt-8 w-full space-y-3 p-5 text-left text-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#94A3B8]">DETALLES</p>
          <Row label="Servicio" value={platform?.name ?? "Servicio"} />
          <Row label="Duración" value={selectedOption?.label ?? selected?.name ?? "—"} />
          <Row label="Monto" value={selected ? formatCurrency(selected.salePrice) : "—"} />
          <Row label="Fecha" value={formatDate(new Date().toISOString())} />
          <div className="flex items-center justify-between">
            <span className="text-[#94A3B8]">Estado</span>
            <Badge tone="warning">En revisión</Badge>
          </div>
        </Card>
        <div className="sticky-app-cta mt-auto w-full pt-8">
          <Button href="/cliente" className="w-full min-h-12">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ScreenHeader
        title={step === "plan" ? "Renovar servicio" : step === "pay" ? "Realiza tu pago" : "Enviar comprobante"}
        backHref={step === "plan" ? `/cliente/servicios/${service.id}` : undefined}
        onBack={
          step === "pay" ? () => setStep("plan") : step === "voucher" ? () => setStep("pay") : undefined
        }
      />

      {platform ? (
        <Card className="flex items-center gap-3 p-4">
          <PlatformMark name={platform.name} from={platform.accentFrom} to={platform.accentTo} size="sm" />
          <div>
            <p className="font-semibold text-[#F8FAFC]">{platform.name}</p>
            <p className="text-xs text-[#94A3B8]">Vence {formatDate(service.endDate)}</p>
          </div>
        </Card>
      ) : null}

      {step === "plan" ? (
        <>
          <p className="text-sm text-[#94A3B8]">Elige cuánto tiempo deseas renovar</p>
          <div className="space-y-2">
            {options.map((item) => {
              const product = item.product;
              if (!product) return null;
              const selectedPlan = productId === product.id;
              const save = savingsPercent(monthPrice, product.salePrice, item.months);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setProductId(product.id)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-[16px] border px-4 py-3 text-left ${
                    selectedPlan
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                      : "border-[#253047] bg-[#111827]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selectedPlan ? "border-[#8B5CF6] bg-[#8B5CF6]" : "border-[#94A3B8]"
                    }`}
                  >
                    {selectedPlan ? <CheckIcon className="h-3 w-3 text-white" /> : null}
                  </span>
                  <span className="flex-1 text-sm text-[#F8FAFC]">{item.label}</span>
                  {save ? (
                    <span className="rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#22C55E]">
                      Ahorra {save}%
                    </span>
                  ) : null}
                  <span className="text-sm font-semibold text-[#F8FAFC]">{formatCurrency(product.salePrice)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-end justify-between pt-2">
            <span className="text-sm text-[#94A3B8]">TOTAL</span>
            <span className="text-2xl font-bold text-[#F8FAFC]">
              {selected ? formatCurrency(selected.salePrice) : "—"}
            </span>
          </div>
          <div className="sticky-app-cta">
            <Button type="button" className="w-full min-h-12" disabled={!selected} onClick={() => setStep("pay")}>
              Continuar al pago
            </Button>
          </div>
        </>
      ) : null}

      {step === "pay" ? (
        <>
          <Card className="flex items-center gap-3 p-4">
            {platform ? (
              <PlatformMark name={platform.name} from={platform.accentFrom} to={platform.accentTo} size="sm" />
            ) : null}
            <div className="flex-1">
              <p className="text-sm text-[#F8FAFC]">{platform?.name}</p>
              <p className="text-xs text-[#94A3B8]">{selectedOption?.label}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-wide text-[#94A3B8] uppercase">Total a pagar</p>
              <p className="text-xl font-bold text-[#F8FAFC]">
                {selected ? formatCurrency(selected.salePrice) : "—"}
              </p>
            </div>
          </Card>
          <p className="text-sm text-[#94A3B8]">Elige un medio de pago</p>
          <SellerPayDetails methods={methods} selectedId={paymentMethodId} onSelect={setPaymentMethodId} />
          {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
          <div className="sticky-app-cta">
            <Button type="button" className="w-full min-h-12" disabled={!pay} onClick={() => setStep("voucher")}>
              Ya realicé el pago
            </Button>
          </div>
        </>
      ) : null}

      {step === "voucher" ? (
        <>
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-[#253047] bg-[#111827] px-4 text-center">
            <UploadIcon className="h-10 w-10 text-[#8B5CF6]" />
            <p className="mt-3 font-semibold text-[#F8FAFC]">Sube tu comprobante</p>
            <p className="mt-1 text-xs text-[#94A3B8]">Puedes subir una imagen PNG o JPEG (máx. 5 MB)</p>
            <span className="mt-4 inline-flex rounded-full border border-[#253047] px-4 py-2 text-sm text-[#F8FAFC]">
              Seleccionar archivo
            </span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (!next) return;
                setFile(next);
                setPreview(URL.createObjectURL(next));
                setError(null);
              }}
            />
          </label>
          {file ? (
            <Card className="flex items-center gap-3 p-4">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#F8FAFC]">{file.name}</p>
                <p className="text-xs text-[#94A3B8]">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                className="text-[#94A3B8]"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                ✕
              </button>
            </Card>
          ) : null}
          <p className="text-xs text-[#94A3B8]">
            Verifica que la imagen sea clara y se vean los datos de la transacción.
          </p>
          {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
          <div className="sticky-app-cta">
            <Button type="button" className="w-full min-h-12" disabled={pending || !file} onClick={submit}>
              {pending ? "Enviando..." : "Enviar comprobante"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#94A3B8]">{label}</span>
      <span className="text-[#F8FAFC]">{value}</span>
    </div>
  );
}
