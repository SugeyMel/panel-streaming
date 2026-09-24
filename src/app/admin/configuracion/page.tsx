import { AdminWhatsappSetting } from "@/components/admin/AdminWhatsappSetting";
import { loadAdminWhatsapp } from "@/lib/seller-permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentMethodsManager } from "@/components/payments/PaymentMethodsManager";
import { loadPaymentMethods, loadSellers } from "@/lib/data/queries";

export default async function AdminSettingsPage() {
  const sellers = await loadSellers();
  const adminWhatsapp = await loadAdminWhatsapp();
  const methodsBySeller = await Promise.all(
    sellers.map(async (seller) => ({ seller, methods: await loadPaymentMethods(seller.id) })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Medios de pago de cada vendedor: Yape, Plin o cuenta, a nombre de quién sale."
      />
      <AdminWhatsappSetting current={adminWhatsapp} />
      {methodsBySeller.map(({ seller, methods }) => (
        <div key={seller.id} className="space-y-2">
          <h2 className="text-sm font-semibold text-white">{seller.businessName} ({seller.name})</h2>
          <PaymentMethodsManager sellerId={seller.id} methods={methods} />
        </div>
      ))}
    </div>
  );
}
