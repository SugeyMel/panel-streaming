import { SellersManager } from "@/components/admin/SellersManager";
import { loadSellers } from "@/lib/data/queries";
import { loadClientCodesMap } from "@/lib/seller-permissions";

export default async function AdminSellersPage() {
  const sellers = await loadSellers();
  const clientCodes = await loadClientCodesMap(sellers.map((item) => item.id));
  return <SellersManager sellers={sellers} clientCodes={clientCodes} />;
}
