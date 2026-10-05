"use client";

import { adminUpsertDirectProductAction } from "@/app/actions/admin-products";
import { ProductsManager } from "@/components/catalog/ProductsManager";
import type { Platform, Product, Seller } from "@/lib/types";

export function AdminDirectProducts({
  seller,
  products,
  platforms,
}: {
  seller: Seller;
  products: Product[];
  platforms: Platform[];
}) {
  return (
    <ProductsManager
      seller={seller}
      products={products}
      platforms={platforms}
      saveAction={adminUpsertDirectProductAction}
      showInventory={false}
      embedded
    />
  );
}
