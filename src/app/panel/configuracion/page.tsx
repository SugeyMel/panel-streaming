import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentMethodsManager } from "@/components/payments/PaymentMethodsManager";
import { loadPaymentMethods, loadSellerById, panelScope } from "@/lib/data/queries";

export default async function SellerSettingsPage() {
  const { sellerId } = await panelScope();
  const [seller, methods] = await Promise.all([
    loadSellerById(sellerId),
    loadPaymentMethods(sellerId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Configuración" description="Datos de tu negocio y medios de pago (hasta 5)." />
      <Card className="space-y-2 p-6 text-sm text-[#94A3B8]">
        <p>Negocio: <span className="text-[#F8FAFC]">{seller?.businessName}</span></p>
        <p>Tienda: <span className="text-[#F8FAFC]">/tienda/{seller?.slug}</span></p>
      </Card>
      {sellerId ? <PaymentMethodsManager sellerId={sellerId} methods={methods} embedded /> : null}
    </div>
  );
}
