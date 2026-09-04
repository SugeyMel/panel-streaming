import { SellersManager } from "@/components/admin/SellersManager";
import { loadSellers } from "@/lib/data/queries";

export default async function AdminSellersPage() {
  const sellers = await loadSellers();
  return <SellersManager sellers={sellers} />;
}
