import { SellerAccountsBoard } from "@/components/panel/SellerAccountsBoard";
import { loadPlatforms, loadStreamingAccounts, loadSupplierProducts, panelScope } from "@/lib/data/queries";
import { loadAdminWhatsapp } from "@/lib/seller-permissions";

export const dynamic = "force-dynamic";

export default async function SellerAccountsPage() {
  // Solo las cuentas del vendedor autenticado (streaming_accounts.seller_id = su id).
  const { sellerId } = await panelScope();
  const [allAccounts, platforms, supplierProducts, adminWhatsapp] = await Promise.all([
    loadStreamingAccounts(sellerId),
    loadPlatforms(),
    loadSupplierProducts(),
    loadAdminWhatsapp().catch(() => ""),
  ]);
  // Solo las cuentas que el administrador asignó a este vendedor.
  // Las desactivadas se muestran con aviso y botón de WhatsApp para pedir la activación.
  const accounts = allAccounts.filter((item) => item.assignedByAdmin);
  // Productos del catálogo mayorista del administrador: destino del botón "Renovar".
  const renewTargets = supplierProducts
    .filter((item) => item.status === "active" && item.platformId)
    .map((item) => ({ id: item.id, platformId: String(item.platformId), offerKind: item.offerKind }));

  return (
    <SellerAccountsBoard
      accounts={accounts}
      platforms={platforms}
      renewTargets={renewTargets}
      adminWhatsapp={adminWhatsapp}
    />
  );
}
