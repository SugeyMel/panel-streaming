"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/store/ProductCard";
import { Modal } from "@/components/ui/Modal";
import { activePlans, type ProductOffer } from "@/lib/selectors";
import { formatStorePrice, lowestActivePrice, offerCompareAt } from "@/lib/store-catalog";
import type { Platform } from "@/lib/types";

export function StoreProductCard({
  offer,
  platform,
  checkoutHref,
  onViewPlans,
}: {
  offer: ProductOffer;
  platform: Platform;
  checkoutHref?: string;
  onViewPlans?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const plans = activePlans(offer);
  const from = lowestActivePrice(offer);
  const compare = offerCompareAt(offer);
  const soldOut = plans.length === 0 || plans.every((item) => item.product.soldOut);

  function handlePlans() {
    if (onViewPlans) {
      onViewPlans();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <ProductCard
        platform={platform}
        title={offer.name}
        description={offer.description || platform.tagline}
        priceFrom={from}
        compareAt={compare}
        badge={
          <>
            {offer.onOffer ? (
              <p className="mb-0.5 text-[10px] leading-none font-semibold text-orange-300">🔥 OFERTA</p>
            ) : null}
            {!offer.active ? (
              <p className="mb-0.5 text-[10px] leading-none font-medium text-amber-300">Inactivo</p>
            ) : null}
          </>
        }
        ctaLabel={onViewPlans || !soldOut ? "Ver planes" : "Agotado"}
        ctaDisabled={!onViewPlans && soldOut}
        onCta={handlePlans}
      />
      {checkoutHref ? (
        <Modal open={open} title={offer.name} onClose={() => setOpen(false)}>
          <p className="text-sm text-[#94A3B8]">Elige una duración publicada por este vendedor.</p>
          <div className="mt-4 space-y-2">
            {plans.map((plan) => (
              <Link
                key={plan.product.id}
                href={`${checkoutHref}${plan.product.id}`}
                className="flex items-center justify-between rounded-xl border border-[#253047] bg-[#0B111C] px-4 py-3 text-sm text-[#F1F5F9] hover:border-[#2563EB]/50"
              >
                <span className="font-medium">{plan.label}</span>
                <span className="flex items-center gap-2 font-bold">
                  {offer.onOffer &&
                  plan.product.compareAtPrice != null &&
                  plan.product.compareAtPrice > plan.product.salePrice ? (
                    <span className="text-xs font-normal text-[#64748B] line-through">
                      {formatStorePrice(plan.product.compareAtPrice)}
                    </span>
                  ) : null}
                  {formatStorePrice(plan.product.salePrice)}
                </span>
              </Link>
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
