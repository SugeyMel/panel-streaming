import { supplierProductImagePublicUrl } from "@/lib/supplier-product-images";
import type { WholesaleCatalogProduct, WholesaleOfferKind, WholesaleSale, WholesaleStockEntry } from "@/lib/types";

export function parseOfferKind(value: unknown): WholesaleOfferKind {
  return value === "cuenta_completa" ? "cuenta_completa" : "perfil";
}

export function offerKindLabel(kind: WholesaleOfferKind) {
  return kind === "cuenta_completa" ? "Cuenta completa" : "Perfil";
}

export type WholesalePricing = {
  unitPrice: number;
  packUnitPrice: number;
  bulkQty: number;
  hasPackDeal: boolean;
  fromPrice: number;
};

export type WholesaleFeatureKey = "account" | "devices" | "pin" | "quality" | "content" | "resale" | "custom";

/**
 * Las características que escribe la administradora se guardan dentro de la descripción,
 * después de esta marca (una por línea). Así no hace falta cambiar la base de datos.
 */
const FEATURES_MARKER = "[[caracteristicas]]";

export function splitProductDescription(description: string | null | undefined) {
  const raw = description ?? "";
  const index = raw.indexOf(FEATURES_MARKER);
  if (index < 0) return { text: raw.trim(), features: [] as string[] };
  const features = raw
    .slice(index + FEATURES_MARKER.length)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);
  return { text: raw.slice(0, index).trim(), features };
}

export function joinProductDescription(text: string, featuresText: string) {
  const features = featuresText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);
  const clean = text.trim();
  if (!features.length) return clean;
  return `${clean}\n${FEATURES_MARKER}\n${features.join("\n")}`;
}

export function wholesalePricing(product: {
  wholesalePrice: number;
  unitPrice?: number | null;
  bulkQty?: number | null;
}): WholesalePricing {
  const packUnitPrice = Math.max(0, Number(product.wholesalePrice) || 0);
  const parsedQty = Number(product.bulkQty);
  const bulkQty = Number.isInteger(parsedQty) && parsedQty >= 2 ? parsedQty : 3;
  const rawUnit = Number(product.unitPrice) || 0;
  const unitPrice = rawUnit > 0 ? rawUnit : packUnitPrice;
  const hasPackDeal = unitPrice > packUnitPrice && packUnitPrice > 0;
  const fromPrice = hasPackDeal ? packUnitPrice : packUnitPrice || unitPrice;
  return { unitPrice, packUnitPrice, bulkQty, hasPackDeal, fromPrice };
}

/** Textos de la tarjeta. Las características y etiquetas salen de lo que escribe la administradora en cada producto. */
export function wholesaleCatalogCopy(kind: WholesaleOfferKind, description?: string) {
  const { text, features } = splitProductDescription(description);
  const list = features.map((label) => ({ key: "custom" as WholesaleFeatureKey, label }));
  const full = kind === "cuenta_completa";
  return {
    badge: full ? "CUENTA COMPLETA" : "PERFIL",
    subtitle: text || (full ? "Cuenta completa" : "Perfil"),
    text,
    tags: features.slice(0, 3),
    features: list,
  };
}

export function isMissingRelation(message: string) {
  return /does not exist|schema cache|could not find the table/i.test(message);
}

const PRICING_TOKEN = /\[\[psu:([0-9]+(?:\.[0-9]+)?):([0-9]+)\]\]/;
const IMAGE_TOKEN = /\[\[psi:([^\]]+)\]\]/;
const SORT_TOKEN = /\[\[pso:(-?[0-9]+)\]\]/;

export function stripPricingToken(notes: string | null | undefined) {
  return (notes ?? "").replace(PRICING_TOKEN, "").trim();
}

export function stripImageToken(notes: string | null | undefined) {
  return (notes ?? "").replace(IMAGE_TOKEN, "").trim();
}

export function stripSortToken(notes: string | null | undefined) {
  return (notes ?? "").replace(SORT_TOKEN, "").trim();
}

export function stripInternalTokens(notes: string | null | undefined) {
  return stripSortToken(stripImageToken(stripPricingToken(notes)));
}

export function withPricingToken(notes: string | null | undefined, unitPrice: number, bulkQty: number) {
  const clean = stripPricingToken(notes);
  const token = `[[psu:${unitPrice}:${bulkQty}]]`;
  return clean ? `${clean}\n${token}` : token;
}

export function withImageToken(notes: string | null | undefined, imagePath: string | null) {
  const clean = stripImageToken(notes);
  if (!imagePath) return clean;
  const token = `[[psi:${imagePath}]]`;
  return clean ? `${clean}\n${token}` : token;
}

export function withSortToken(notes: string | null | undefined, sortOrder: number) {
  const clean = stripSortToken(notes);
  const token = `[[pso:${sortOrder}]]`;
  return clean ? `${clean}\n${token}` : token;
}

export function parsePricingToken(notes: string | null | undefined) {
  const match = (notes ?? "").match(PRICING_TOKEN);
  if (!match) return { unitPrice: 0, bulkQty: 0 };
  return { unitPrice: Number(match[1]) || 0, bulkQty: Number(match[2]) || 0 };
}

export function parseImageToken(notes: string | null | undefined) {
  const match = (notes ?? "").match(IMAGE_TOKEN);
  return match?.[1]?.trim() || null;
}

export function parseSortToken(notes: string | null | undefined) {
  const match = (notes ?? "").match(SORT_TOKEN);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function nextWholesaleSortOrder(rows: { sort_order?: unknown; notes?: unknown }[]) {
  const values = rows.map((row) => {
    const column = Number(row.sort_order);
    if (Number.isFinite(column)) return column;
    return parseSortToken(row.notes ? String(row.notes) : "") ?? -1;
  });
  return (values.length ? Math.max(-1, ...values) : -1) + 1;
}

export function compareWholesaleCatalog(
  a: { sortOrder: number; name: string },
  b: { sortOrder: number; name: string },
) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, "es");
}

export function stockFromLedger(
  productId: string,
  entries: WholesaleStockEntry[],
  sales: WholesaleSale[],
) {
  const acquired = entries
    .filter((item) => item.supplierProductId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const sold = sales
    .filter((item) => item.supplierProductId === productId && item.status === "active")
    .reduce((sum, item) => sum + item.quantity, 0);
  return { acquired, sold, available: acquired - sold };
}

export function mapWholesaleCatalogProduct(
  row: Record<string, unknown>,
  entries: WholesaleStockEntry[],
  sales: WholesaleSale[],
): WholesaleCatalogProduct {
  const id = String(row.id);
  const rawNotes = row.notes ? String(row.notes) : null;
  const imagePath = row.image_path ? String(row.image_path) : parseImageToken(rawNotes);
  const fromNotes = parsePricingToken(rawNotes);
  const unitFromColumn = Number(row.unit_price ?? 0);
  const bulkFromColumn = Number(row.bulk_qty ?? 0);
  const stock = stockFromLedger(id, entries, sales);
  return {
    id,
    supplierId: row.supplier_id ? String(row.supplier_id) : null,
    platformId: row.platform_id ? String(row.platform_id) : null,
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    wholesalePrice: Number(row.wholesale_price ?? 0),
    unitPrice: unitFromColumn > 0 ? unitFromColumn : fromNotes.unitPrice,
    bulkQty: bulkFromColumn >= 2 ? bulkFromColumn : fromNotes.bulkQty >= 2 ? fromNotes.bulkQty : 3,
    costPrice: Number(row.cost_price ?? 0),
    offerKind: parseOfferKind(row.offer_kind),
    status: String(row.status ?? "active"),
    notes: stripInternalTokens(rawNotes) || null,
    imagePath,
    imageUrl: supplierProductImagePublicUrl(imagePath, String(row.updated_at ?? imagePath ?? "")),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : (parseSortToken(rawNotes) ?? 0),
    ...stock,
  };
}

export function mapWholesaleSale(row: Record<string, unknown>): WholesaleSale {
  return {
    id: String(row.id),
    supplierProductId: String(row.supplier_product_id),
    sellerId: String(row.seller_id),
    platformId: row.platform_id ? String(row.platform_id) : null,
    offerKind: parseOfferKind(row.offer_kind),
    quantity: Number(row.quantity ?? 1),
    costPrice: Number(row.cost_price ?? 0),
    wholesalePrice: Number(row.wholesale_price ?? 0),
    purchasedAt: String(row.purchased_at ?? "").slice(0, 10),
    expiresAt: String(row.expires_at ?? "").slice(0, 10),
    status: row.status === "cancelled" ? "cancelled" : "active",
    notes: row.notes ? String(row.notes) : null,
  };
}

export function mapWholesaleStockEntry(row: Record<string, unknown>): WholesaleStockEntry {
  return {
    id: String(row.id),
    supplierProductId: String(row.supplier_product_id),
    supplierId: row.supplier_id ? String(row.supplier_id) : null,
    quantity: Number(row.quantity ?? 0),
    unitCost: row.unit_cost == null || row.unit_cost === "" ? null : Number(row.unit_cost),
    receivedAt: String(row.received_at ?? "").slice(0, 10),
    notes: row.notes ? String(row.notes) : null,
  };
}
