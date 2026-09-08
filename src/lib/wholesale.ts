import { supplierProductImagePublicUrl } from "@/lib/supplier-product-images";
import type { WholesaleCatalogProduct, WholesaleOfferKind, WholesaleSale, WholesaleStockEntry } from "@/lib/types";

export function parseOfferKind(value: unknown): WholesaleOfferKind {
  return value === "cuenta_completa" ? "cuenta_completa" : "perfil";
}

export function offerKindLabel(kind: WholesaleOfferKind) {
  return kind === "cuenta_completa" ? "Cuenta completa" : "Perfil";
}

export function isMissingRelation(message: string) {
  return /does not exist|schema cache|could not find the table/i.test(message);
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
  const imagePath = row.image_path ? String(row.image_path) : null;
  const stock = stockFromLedger(id, entries, sales);
  return {
    id,
    supplierId: row.supplier_id ? String(row.supplier_id) : null,
    platformId: row.platform_id ? String(row.platform_id) : null,
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    wholesalePrice: Number(row.wholesale_price ?? 0),
    costPrice: Number(row.cost_price ?? 0),
    offerKind: parseOfferKind(row.offer_kind),
    status: String(row.status ?? "active"),
    notes: row.notes ? String(row.notes) : null,
    imagePath,
    imageUrl: supplierProductImagePublicUrl(imagePath),
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
