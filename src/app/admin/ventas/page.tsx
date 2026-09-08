import { WholesaleSalesBoard } from "@/components/admin/WholesaleSalesBoard";
import { loadPlatforms, loadSellers, loadSupplierProducts, loadWholesaleSales } from "@/lib/data/queries";

export default async function AdminVentasPage() {
  const [sales, products, platforms, sellers] = await Promise.all([
    loadWholesaleSales(),
    loadSupplierProducts(),
    loadPlatforms(),
    loadSellers(),
  ]);
  return <WholesaleSalesBoard sales={sales} products={products} platforms={platforms} sellers={sellers} />;
}
