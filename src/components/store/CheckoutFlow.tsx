"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { placeCheckoutAction } from "@/app/actions/business";
import { SellerPayDetails } from "@/components/payments/SellerPayDetails";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { UploadIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import type { Product, Seller, SellerPaymentMethod } from "@/lib/types";
import type { Platform } from "@/lib/types";

export function CheckoutFlow({
  seller,
  product,
  platform,
  relatedProducts = [],
  methods,
  customerName = "",
  customerWhatsapp = "",
  lockCustomer = false,
}: {
  seller: Seller;
  product: Product;
  platform?: Platform;
  relatedProducts?: Product[];
  methods: SellerPaymentMethod[];
  customerName?: string;
  customerWhatsapp?: string;
  lockCustomer?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const activeMethods = methods.filter((item) => item.isActive !== false);
  const [paymentMethodId, setPaymentMethodId] = useState(activeMethods[0]?.id ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pay = activeMethods.find((item) => item.id === paymentMethodId);

  if (params.get("producto") && params.get("producto") !== product.id) {
    return <p className="p-8 text-slate-400">El producto no pertenece a esta tienda.</p>;
  }

  return (
    <main className={`mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 ${lockCustomer ? "px-0 py-0 sm:px-0" : "px-4 py-10 sm:px-6"}`}>
      <Card className="space-y-3 p-6 text-sm text-slate-300">
        <h1 className="text-2xl font-semibold text-white">Checkout</h1>
        <p className="flex items-center gap-2">
          Plataforma:{" "}
          {platform ? <PlatformName platform={platform} size="card" className="text-white" /> : <span className="text-white">—</span>}
        </p>
        {relatedProducts.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {relatedProducts.filter((item) => item.active).map((item) => (
              <Button
                key={item.id}
                href={
                  lockCustomer
                    ? `/cliente/checkout?producto=${item.id}`
                    : `/tienda/${seller.slug}/checkout?producto=${item.id}`
                }
                variant={item.id === product.id ? "primary" : "secondary"}
                className="px-3 py-2 text-xs"
              >
                {item.durationDays} días · {formatCurrency(item.salePrice)}
              </Button>
            ))}
          </div>
        ) : (
          <p>Plan: <span className="text-white">{product.durationDays} días</span></p>
        )}
        <p>Precio: <span className="text-white">{formatCurrency(product.salePrice)}</span></p>
        <p>Total: <span className="text-white">{formatCurrency(product.salePrice)}</span></p>
        <p className="text-xs text-slate-500">El monto se confirma en servidor. No se acepta un precio enviado por el navegador.</p>
      </Card>
      <Card className="space-y-4 p-6">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!pay) {
              setError("Elige un medio de pago.");
              return;
            }
            setPending(true);
            setError(null);
            const form = new FormData(event.currentTarget);
            form.set("sellerSlug", seller.slug);
            form.set("productId", product.id);
            form.set("method", pay.kind === "plin" ? "plin" : "yape");
            if (file) form.set("voucher", file);
            const result = await placeCheckoutAction(form);
            setPending(false);
            if (!result.ok) {
              setError(result.error ?? "No se pudo registrar el pedido");
              return;
            }
            router.push(
              result.goToCustomerOrders
                ? `/cliente/pedidos`
                : `/tienda/${seller.slug}/pedido?codigo=${result.code}`,
            );
          }}
        >
          <label className="block text-sm">
            Nombre
            <input
              name="name"
              required
              defaultValue={customerName}
              readOnly={lockCustomer}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5"
            />
          </label>
          <label className="block text-sm">
            WhatsApp
            <div className="mt-2">
              <WhatsAppInput name="whatsapp" defaultValue={customerWhatsapp} required readOnly={lockCustomer} />
            </div>
          </label>
          {lockCustomer ? (
            <p className="text-xs text-slate-500">Este pedido queda en tu cuenta. Lo verás en Mis pedidos.</p>
          ) : null}
          <label className="block text-sm">
            Correo (opcional)
            <input name="email" type="email" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" />
          </label>
          <div>
            <p className="mb-2 text-sm">Elige un medio de pago</p>
            <SellerPayDetails methods={methods} selectedId={paymentMethodId} onSelect={setPaymentMethodId} />
          </div>
          <div>
            <p className="mb-2 text-sm text-[#F1F5F9]">Adjuntar comprobante</p>
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#253047] bg-[#111827] px-4 py-6 text-center">
              <UploadIcon className="h-10 w-10 text-[#8B5CF6]" />
              <p className="mt-3 text-sm font-semibold text-[#F8FAFC]">
                {file ? "Cambiar comprobante" : "Adjuntar comprobante"}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">PNG, JPG o JPEG · máx. 5 MB</p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#253047] px-4 py-2 text-sm text-[#F8FAFC]">
                <UploadIcon className="h-4 w-4" />
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
                }}
              />
            </label>
            {file ? (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#253047] bg-[#111827] p-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Vista previa del comprobante" className="h-12 w-12 rounded-lg object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#F8FAFC]">{file.name}</p>
                  <p className="text-xs text-[#94A3B8]">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-[#94A3B8]"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  Quitar
                </button>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || !pay}>
            {pending ? "Registrando..." : "Ya pagué"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
