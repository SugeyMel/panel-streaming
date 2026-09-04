"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { Badge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { activePlans, type ProductOffer } from "@/lib/selectors";
import type { Platform } from "@/lib/types";

export function ProductCard({
  offer,
  platform,
  checkoutHref,
}: {
  offer: ProductOffer;
  platform: Platform;
  checkoutHref: string;
}) {
  const plans = activePlans(offer);
  const [selectedId, setSelectedId] = useState(plans[0]?.product.id ?? "");
  const selected = plans.find((item) => item.product.id === selectedId) ?? plans[0];
  const soldOut = plans.length === 0 || plans.every((item) => item.product.soldOut);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#253047] px-5 py-4">
        <PlatformLogo platform={platform} size="card" />
        <p className="text-sm text-slate-400">{platform.name}</p>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">{offer.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{offer.description}</p>
          </div>
          <Badge tone={soldOut ? "warning" : "success"}>{soldOut ? "Agotado" : "Disponible"}</Badge>
        </div>
        <p className="text-xs text-slate-400">Elige el plazo</p>
        <div className="grid grid-cols-2 gap-2">
          {plans.map((plan) => {
            const active = selected?.product.id === plan.product.id;
            return (
              <button
                key={plan.product.id}
                type="button"
                onClick={() => setSelectedId(plan.product.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-cyan-400 bg-cyan-400/10 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                }`}
              >
                <span className="block font-medium">{plan.label}</span>
                <span className="block text-xs text-slate-400">{formatCurrency(plan.product.salePrice)}</span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <Button href={`${checkoutHref}${selected.product.id}`} className="w-full">
            Comprar {selected.label} · {formatCurrency(selected.product.salePrice)}
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Sin plazos publicados.</p>
        )}
      </div>
    </Card>
  );
}
