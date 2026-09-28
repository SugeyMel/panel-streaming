import { BaseDatosTabs } from "@/components/panel/BaseDatosTabs";
import { VendedoresTable } from "@/components/vendedores/VendedoresTable";
import { loadMessageTemplates, loadPlatforms, loadStreamingAccounts, panelScope } from "@/lib/data/queries";

export default async function SellerVendedoresPage() {
  const { sellerId } = await panelScope();
  const [plantillas, platforms, accounts] = await Promise.all([
    loadMessageTemplates(sellerId),
    loadPlatforms(),
    loadStreamingAccounts(sellerId),
  ]);
  return (
    <>
      <BaseDatosTabs active="vendedores" />
      <VendedoresTable plantillas={plantillas} platforms={platforms} accounts={accounts} />
    </>
  );
}
