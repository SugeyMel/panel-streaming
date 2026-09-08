import { ProductsManager } from "@/components/catalog/ProductsManager";
import {
  loadPlatforms,
  loadProducts,
  loadSellerById,
  loadStoreOfferLinks,
  loadStreamingAccounts,
  panelScope,
} from "@/lib/data/queries";

export default async function SellerProductsPage() {
  const { sellerId } = await panelScope();
  const [list, platforms, accounts, offerLinks, seller] = await Promise.all([
    loadProducts(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
    loadStoreOfferLinks(sellerId),
    loadSellerById(sellerId),
  ]);
  if (!seller) return null;
  return (
    <ProductsManager
      seller={seller}
      products={list}
      platforms={platforms}
      accounts={accounts}
      offerLinks={offerLinks}
    />
  );
}
