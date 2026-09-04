"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { placeCheckoutAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod, Product, Seller } from "@/lib/types";
import type { Platform } from "@/lib/types";

export function CheckoutFlow({
  seller,
  product,
  platform,
  relatedProducts = [],
  customerName = "",
  customerWhatsapp = "",
  lockCustomer = false,
}: {
  seller: Seller;
  product: Product;
  platform?: Platform;
  relatedProducts?: Product[];
  customerName?: string;
  customerWhatsapp?: string;
  lockCustomer?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("yape");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const payment = useMemo(
    () =>
      method === "yape"
        ? { holder: seller.yapeHolder, number: seller.yapeNumber }
        : { holder: seller.plinHolder, number: seller.plinNumber },
    [method, seller],
  );

  if (params.get("producto") && params.get("producto") !== product.id) {
    return <p className="p-8 text-slate-400">El producto no pertenece a esta tienda.</p>;
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-2 sm:px-6">
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
                href={`/tienda/${seller.slug}/checkout?producto=${item.id}`}
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
            setPending(true);
            setError(null);
            const form = new FormData(event.currentTarget);
            form.set("sellerSlug", seller.slug);
            form.set("productId", product.id);
            form.set("method", method);
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
            <input
              name="whatsapp"
              required
              defaultValue={customerWhatsapp}
              readOnly={lockCustomer}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5"
            />
          </label>
          {lockCustomer ? (
            <p className="text-xs text-slate-500">Este pedido queda en tu cuenta. Lo verás en Mis pedidos.</p>
          ) : null}
          <label className="block text-sm">
            Correo (opcional)
            <input name="email" type="email" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5" />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant={method === "yape" ? "primary" : "secondary"} onClick={() => setMethod("yape")}>
              Yape
            </Button>
            <Button type="button" variant={method === "plin" ? "primary" : "secondary"} onClick={() => setMethod("plin")}>
              Plin
            </Button>
          </div>
          <p className="text-sm text-slate-300">Titular: {payment.holder}</p>
          <p className="text-sm text-slate-300">Número: {payment.number}</p>
          <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/4 text-xs text-slate-500">
            QR {method.toUpperCase()} configurado por el vendedor
          </div>
          <label className="block text-sm">
            Adjuntar comprobante (PNG, JPG, JPEG · máx. 5 MB)
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="mt-2 block w-full text-sm"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (!next) return;
                setFile(next);
                setPreview(URL.createObjectURL(next));
              }}
            />
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa del comprobante" className="max-h-40 rounded-xl object-contain" />
          ) : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Registrando..." : "Ya pagué"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
