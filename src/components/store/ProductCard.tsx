"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { platformLogoSrc } from "@/lib/platform-logos";
import { formatStorePrice } from "@/lib/store-catalog";
import type { Platform } from "@/lib/types";

function brandGlow(hex: string, alpha: number) {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(79, 70, 229, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ProductCard({
  platform,
  title,
  description,
  priceFrom,
  compareAt,
  coverUrl,
  badge,
  ctaLabel = "Ver planes",
  ctaDisabled = false,
  onCta,
  ctaHref,
}: {
  platform: Platform;
  title: string;
  description: string;
  priceFrom: number | null;
  compareAt?: number | null;
  coverUrl?: string | null;
  badge?: ReactNode;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  onCta?: () => void;
  ctaHref?: string;
}) {
  const glow = platform.accentFrom || "#4F46E5";
  const logoSrc = platformLogoSrc(platform);
  const cover = coverUrl?.trim() || null;
  const discount =
    priceFrom != null && compareAt != null && compareAt > priceFrom
      ? Math.max(1, Math.round(((compareAt - priceFrom) / compareAt) * 100))
      : null;
  const buttonClass =
    "mt-1.5 flex h-7 min-h-7 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

  const cta = ctaHref ? (
    <Link href={ctaHref} className={buttonClass}>
      {ctaLabel}
    </Link>
  ) : (
    <button type="button" disabled={ctaDisabled} onClick={onCta} className={buttonClass}>
      {ctaLabel}
    </button>
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#253047] bg-[#111827]">
      <div className="relative h-[72px] w-full shrink-0 bg-[#0D1320] md:h-[96px]">
        <div className="absolute inset-0 overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(ellipse at center, ${brandGlow(glow, 0.22)} 0%, #0D1320 72%)`,
                }}
              />
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc} alt="" className="absolute inset-0 z-[1] h-full w-full object-cover object-center" />
              ) : null}
            </>
          )}
        </div>
        {discount ? (
          <div
            className="absolute top-1.5 left-1 z-[2] -rotate-[8deg] rounded-md bg-gradient-to-br from-[#EA580C] to-[#FBBF24] px-1.5 py-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
            aria-label={`Descuento ${discount}%`}
          >
            <p className="text-[11px] leading-none font-black text-white">-{discount}%</p>
            <p className="mt-px text-[6.5px] leading-none font-bold tracking-wide text-white">DSCTO.</p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col px-2 pt-1.5 pb-2">
        {badge}
        <h3 className="line-clamp-1 text-[13px] leading-tight font-bold text-white">{title}</h3>
        <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-[#94A3B8]">{description}</p>
        <div className="mt-1">
          <p className="text-[9px] leading-none text-[#94A3B8]">Desde</p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            {compareAt != null ? (
              <span className="text-[10px] text-[#64748B] line-through">{formatStorePrice(compareAt)}</span>
            ) : null}
            <span className="text-[15px] leading-none font-bold text-white">
              {priceFrom === null ? "—" : formatStorePrice(priceFrom)}
            </span>
          </div>
          {cta}
        </div>
      </div>
    </article>
  );
}
