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
  const buttonClass =
    "mt-3 flex h-[34px] min-h-[34px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

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
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#253047] bg-[#111827]">
      <div className="relative h-[88px] w-full shrink-0 overflow-hidden bg-[#0D1320] md:h-[120px]">
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
              <img
                src={logoSrc}
                alt=""
                className="absolute top-1/2 left-1/2 z-[1] h-auto max-h-[72%] w-[55%] -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            ) : null}
          </>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        {badge}
        <h3 className="line-clamp-2 text-[14px] leading-tight font-bold text-white">{title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#94A3B8]">{description}</p>
        <div className="mt-auto pt-2">
          <p className="text-[10px] text-[#94A3B8]">Desde</p>
          {compareAt != null ? (
            <p className="text-[11px] text-[#64748B] line-through">{formatStorePrice(compareAt)}</p>
          ) : null}
          <p className="text-[17px] leading-none font-bold text-white">
            {priceFrom === null ? "—" : formatStorePrice(priceFrom)}
          </p>
          {cta}
        </div>
      </div>
    </article>
  );
}
