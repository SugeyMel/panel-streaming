import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { customerScope, loadCustomerById, loadSellerById } from "@/lib/data/queries";

export default async function CustomerAccountPage() {
  const { customerId, session } = await customerScope();
  const customer = await loadCustomerById(customerId);
  const seller = await loadSellerById(customer?.sellerId ?? null);

  return (
    <div>
      <PageHeader title="Mi cuenta" />
      <Card className="space-y-2 p-6 text-sm text-slate-300">
        <p>Nombre: <span className="text-white">{customer?.name ?? session.name}</span></p>
        <p>WhatsApp: <span className="text-white">{customer?.whatsapp}</span></p>
        <p>Correo: <span className="text-white">{customer?.email ?? session.email}</span></p>
        <p>Vendedor: <span className="text-white">{seller?.businessName}</span></p>
      </Card>
    </div>
  );
}
