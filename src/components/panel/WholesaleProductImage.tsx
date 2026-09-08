"use client";

import { useState } from "react";
import { SERVICIO_COLOR } from "@/components/accounts/ServiceMark";
import { platformLogoSrc } from "@/lib/platform-logos";
import type { Platform } from "@/lib/types";

export function WholesaleProductImage({
  imageUrl,
  platform,
  name,
}: {
  imageUrl: string | null;
  platform: Platform | null;
  name: string;
}) {
  const platformSrc = platform ? platformLogoSrc(platform) : null;
  const [failedProduct, setFailedProduct] = useState(false);
  const [failedPlatform, setFailedPlatform] = useState(false);
  const showProduct = Boolean(imageUrl) && !failedProduct;
  const showPlatform = !showProduct && Boolean(platformSrc) && !failedPlatform;
  const markName = platform?.name || name;
  const markColor = SERVICIO_COLOR[markName] ?? "bg-[#334155]";

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0B111C]">
      {showProduct ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl ?? ""}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 object-cover"
          onError={() => setFailedProduct(true)}
        />
      ) : showPlatform ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={platformSrc ?? ""}
          alt=""
          width={40}
          height={40}
          className="max-h-10 max-w-10 object-contain"
          onError={() => setFailedPlatform(true)}
        />
      ) : (
        <span className={`inline-flex h-11 w-11 items-center justify-center text-sm font-bold text-white ${markColor}`}>
          {markName.slice(0, 1) || "P"}
        </span>
      )}
    </span>
  );
}
