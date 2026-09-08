"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { HOME_SLOT_META, type HomeImageSlot } from "@/lib/home-images";

export function HomeSlotImage({
  slot,
  url,
  alt,
  sizes,
  icon,
  className = "",
  imageClassName = "",
}: {
  slot: HomeImageSlot;
  url?: string | null;
  alt: string;
  sizes: string;
  icon?: ReactNode;
  className?: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;
  const fallback = HOME_SLOT_META[slot].fallback;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${fallback} ${className}`}>
      {showImage ? (
        <Image
          src={url as string}
          alt={alt}
          fill
          className={`object-cover object-center ${imageClassName}`}
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-white/80">{icon}</span>
      )}
    </div>
  );
}
