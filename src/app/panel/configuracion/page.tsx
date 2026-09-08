import { SellerSettingsBoard } from "@/components/settings/SellerSettingsBoard";
import { getAppSession } from "@/lib/auth/get-session";
import { loadHomeImages, loadMessageTemplates, loadPaymentMethods, loadSellerById, panelScope } from "@/lib/data/queries";

export default async function SellerSettingsPage() {
  const { sellerId } = await panelScope();
  const session = await getAppSession();
  const [seller, methods, plantillas, homeImages] = await Promise.all([
    loadSellerById(sellerId),
    loadPaymentMethods(sellerId),
    loadMessageTemplates(sellerId),
    loadHomeImages(sellerId),
  ]);

  if (!seller) {
    return <p className="text-sm text-[#94A3B8]">No se encontró el negocio.</p>;
  }

  return (
    <SellerSettingsBoard
      seller={seller}
      methods={methods}
      email={session.email || seller.email}
      plantillas={plantillas}
      homeImages={homeImages}
    />
  );
}
