"use client";

import { useState } from "react";
import { PaymentMethodLogo } from "@/components/payments/PaymentMethodLogo";
import { CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { SellerPaymentMethod } from "@/lib/types";

const kindLabel = { yape: "Yape", plin: "Plin", bank: "Cuenta" } as const;

export function SellerPayDetails({
  methods,
  selectedId,
  onSelect,
}: {
  methods: SellerPaymentMethod[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [qrSaved, setQrSaved] = useState(false);
  const pay = methods.find((item) => item.id === selectedId && item.isActive !== false);
  const visible = methods.filter((item) => item.isActive !== false);

  if (visible.length === 0) {
    return <p className="text-sm text-[#EF4444]">Tu vendedor aún no cargó medios de pago.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-[16px] border px-3 py-3 text-xs font-semibold ${
              selectedId === item.id
                ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-[#F8FAFC]"
                : "border-[#253047] bg-[#111827] text-[#94A3B8]"
            }`}
          >
            <PaymentMethodLogo url={item.logoUrl} className="h-6 w-6 rounded-md object-contain" />
            {kindLabel[item.kind]}
          </button>
        ))}
      </div>
      {pay ? (
        <Card className="space-y-3 p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#8B5CF6] uppercase">
            <PaymentMethodLogo url={pay.logoUrl} className="h-8 w-8 rounded-lg object-contain" />
            {kindLabel[pay.kind]}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tracking-tight text-[#F8FAFC]">{pay.accountNumber}</p>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#253047] text-[#38BDF8]"
              aria-label="Copiar"
              onClick={async () => {
                await navigator.clipboard.writeText(pay.accountNumber);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-[#94A3B8]">
            A nombre de <span className="text-[#F8FAFC]">{pay.holderName}</span>
          </p>
          {pay.kind !== "bank" && pay.qrUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pay.qrUrl}
                alt={`Código QR de ${kindLabel[pay.kind]}`}
                className="h-[160px] w-[160px] max-h-[220px] max-w-[220px] rounded-xl border border-[#253047] bg-[#0F172A] object-contain p-2 sm:h-[220px] sm:w-[220px]"
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-10"
                onClick={async () => {
                  const qrUrl = pay.qrUrl;
                  if (!qrUrl) return;
                  const ext = pay.qrPath?.split(".").pop()?.toLowerCase() || "png";
                  const name = `qr-${kindLabel[pay.kind].toLowerCase()}.${ext}`;
                  try {
                    const response = await fetch(qrUrl);
                    if (!response.ok) throw new Error("download");
                    const blob = await response.blob();
                    const href = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = href;
                    link.download = name;
                    link.click();
                    URL.revokeObjectURL(href);
                  } catch {
                    window.open(qrUrl, "_blank", "noopener,noreferrer");
                  }
                  setQrSaved(true);
                  setTimeout(() => setQrSaved(false), 1500);
                }}
              >
                Descargar QR
              </Button>
            </div>
          ) : null}
          {copied ? <p className="text-xs text-[#22C55E]">Copiado</p> : null}
          {qrSaved ? <p className="text-xs text-[#22C55E]">QR descargado</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
