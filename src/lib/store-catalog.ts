import type { Platform, Seller } from "@/lib/types";
import { activePlans, type ProductOffer } from "@/lib/selectors";

export const STORE_CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "series", label: "Películas y Series" },
  { id: "anime", label: "Anime" },
  { id: "musica", label: "Música" },
  { id: "deportes", label: "Deportes" },
  { id: "otros", label: "Otros" },
] as const;

export type StoreCategoryId = (typeof STORE_CATEGORIES)[number]["id"];

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function platformStoreCategory(platform: Platform): Exclude<StoreCategoryId, "todas"> {
  const text = fold(`${platform.slug} ${platform.name}`);
  if (text.includes("crunchy") || text.includes("anime")) return "anime";
  if (text.includes("spotify") || text.includes("youtube")) return "musica";
  if (text.includes("espn") || text.includes("deporte") || text.includes("fox sport")) return "deportes";
  if (
    text.includes("netflix") ||
    text.includes("disney") ||
    text.includes("max") ||
    text.includes("hbo") ||
    text.includes("prime") ||
    text.includes("paramount") ||
    text.includes("vix") ||
    text.includes("universal")
  ) {
    return "series";
  }
  return "otros";
}

export function lowestActivePrice(offer: ProductOffer) {
  const prices = activePlans(offer).map((plan) => plan.product.salePrice);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function formatStorePrice(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(n * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `S/ ${text}`;
}

/** Textos del banner: columnas del vendedor, con fallback visual. */
export function storeBannerCopy(seller: Seller) {
  const description =
    seller.storeBannerDescription.trim() ||
    seller.storeMessage.trim() ||
    "Series, películas, anime, deportes y más. Activa en minutos y disfruta al máximo.";
  const title = seller.storeBannerTitle.trim();
  const accent = seller.storeBannerAccent.trim();
  return {
    enabled: seller.storeBannerEnabled !== false,
    kicker: seller.storeBannerKicker.trim() || "ENTRETENIMIENTO SIN LÍMITES",
    titleLead: title || "Tus plataformas favoritas",
    titleAccent: accent || "en un solo lugar",
    description,
    imageUrl: seller.storeBannerUrl,
  };
}

export function offerCompareAt(offer: ProductOffer) {
  if (!offer.onOffer) return null;
  const from = lowestActivePrice(offer);
  if (offer.compareAtPrice != null && from != null && offer.compareAtPrice > from) {
    return offer.compareAtPrice;
  }
  return null;
}
