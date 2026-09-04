import { ProductsManager } from "@/components/catalog/ProductsManager";
import { loadPlatforms, loadProducts, panelScope } from "@/lib/data/queries";

export default async function SellerProductsPage() {
  const { sellerId } = await panelScope();
  const [list, platforms] = await Promise.all([loadProducts(sellerId), loadPlatforms()]);
  return <ProductsManager products={list} platforms={platforms} />;
}
