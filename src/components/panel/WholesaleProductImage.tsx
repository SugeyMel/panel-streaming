"use client";

import { useEffect, useState } from "react";
import { SERVICIO_COLOR } from "@/components/accounts/ServiceMark";
import { platformLogoSrc } from "@/lib/platform-logos";
import type { Platform } from "@/lib/types";

function useWholesaleImage(imageUrl: string | null, platform: Platform | null, name: string) {
  const logoPlatform = platform
    ? { ...platform, name: `${platform.name} ${name}`.trim() }
    : name
      ? { id: "", slug: "", name, tagline: "", available: true, accentFrom: "", accentTo: "" }
      : null;
  const platformSrc = logoPlatform ? platformLogoSrc(logoPlatform) : null;
  const [failedProduct, setFailedProduct] = useState(false);
  const [failedPlatform, setFailedPlatform] = useState(false);

  useEffect(() => {
    setFailedProduct(false);
    setFailedPlatform(false);
  }, [imageUrl, platformSrc]);

  const hasProductImage = Boolean(imageUrl);
  const showProduct = hasProductImage && !failedProduct;
  return {
    platformSrc,
    showProduct,
    showPlatform: !hasProductImage && Boolean(platformSrc) && !failedPlatform,
    markName: platform?.name || name,
    setFailedProduct,
    setFailedPlatform,
  };
}

export function WholesaleProductImage({
  imageUrl,
  platform,
  name,
  allowPlatformFallback = true,
}: {
  imageUrl: string | null;
  platform: Platform | null;
  name: string;
  allowPlatformFallback?: boolean;
}) {
  const { platformSrc, showProduct, showPlatform, markName, setFailedProduct, setFailedPlatform } = useWholesaleImage(
    imageUrl,
    platform,
    name,
  );
  const markColor = SERVICIO_COLOR[markName] ?? "bg-[#334155]";
  const usePlatform = allowPlatformFallback && showPlatform;

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0B111C]">
      {showProduct ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imageUrl ?? ""}
          src={imageUrl ?? ""}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 object-cover"
          onError={() => setFailedProduct(true)}
        />
      ) : usePlatform ? (
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

export function WholesaleCover({
  imageUrl,
  platform,
  name,
  className = "h-40",
}: {
  imageUrl: string | null;
  platform: Platform | null;
  name: string;
  className?: string;
}) {
  const { platformSrc, showProduct, showPlatform, markName, setFailedProduct, setFailedPlatform } = useWholesaleImage(
    imageUrl,
    platform,
    name,
  );
  const markColor = SERVICIO_COLOR[markName] ?? "bg-[#334155]";

  return (
    <div className={`relative w-full overflow-hidden bg-[#0D1320] ${className}`}>
      {showProduct ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imageUrl ?? ""}
          src={imageUrl ?? ""}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedProduct(true)}
        />
      ) : showPlatform ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={platformSrc ?? ""}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          onError={() => setFailedPlatform(true)}
        />
      ) : (
        <span className={`absolute inset-0 flex items-center justify-center text-3xl font-black text-white ${markColor}`}>
          {markName.slice(0, 1) || "P"}
        </span>
      )}
    </div>
  );
}
