import { PageHeader } from "@/components/ui/PageHeader";
import { SupportForm } from "@/components/support/SupportForm";
import { customerScope, loadCustomerById, loadSellerById } from "@/lib/data/queries";
import { supportMessage, waLink } from "@/lib/whatsapp";

export default async function CustomerSupportPage() {
  const { customerId } = await customerScope();
  const customer = await loadCustomerById(customerId);
  const seller = await loadSellerById(customer?.sellerId ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soporte"
        description="Úsalo si no hay mensaje, el código no funciona o necesitas ayuda adicional."
      />
      {seller?.whatsapp ? (
        <a
          className="inline-flex text-sm text-cyan-300"
          href={waLink(seller.whatsapp, supportMessage(customer?.name ?? "cliente"))}
          target="_blank"
          rel="noreferrer"
        >
          Contactar a {seller.businessName || seller.name} por WhatsApp
        </a>
      ) : null}
      <SupportForm />
    </div>
  );
}
