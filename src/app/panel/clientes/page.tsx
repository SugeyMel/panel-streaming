import { ClientesTable } from "@/components/customers/ClientesTable";
import { BaseDatosTabs } from "@/components/panel/BaseDatosTabs";
import { loadMessageTemplates, panelScope } from "@/lib/data/queries";

export default async function SellerCustomersPage() {
  const { sellerId } = await panelScope();
  const plantillas = await loadMessageTemplates(sellerId);
  return (
    <>
      <BaseDatosTabs active="clientes" />
      <ClientesTable plantillas={plantillas} />
    </>
  );
}
