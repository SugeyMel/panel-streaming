import { ProductCard } from "@/components/store/ProductCard";
import type { Platform } from "@/lib/types";

export function PlatformCard({
  platform,
  priceFrom,
  href = "/tienda/juan",
}: {
  platform: Platform;
  priceFrom: number;
  href?: string;
}) {
  return (
    <ProductCard
      platform={platform}
      title={platform.name}
      description={platform.tagline}
      priceFrom={priceFrom}
      ctaHref={href}
    />
  );
}
