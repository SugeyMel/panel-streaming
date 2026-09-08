import { VendedoresTable } from "@/components/vendedores/VendedoresTable";
import { loadMessageTemplates, loadPlatforms, loadStreamingAccounts, panelScope } from "@/lib/data/queries";

export default async function SellerVendedoresPage() {
  const { sellerId } = await panelScope();
  const [plantillas, platforms, accounts] = await Promise.all([
    loadMessageTemplates(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
  ]);
  return <VendedoresTable plantillas={plantillas} platforms={platforms} accounts={accounts} />;
}
