import { ClientesTable } from "@/components/customers/ClientesTable";
import { loadMessageTemplates, panelScope } from "@/lib/data/queries";

export default async function SellerCustomersPage() {
  const { sellerId } = await panelScope();
  const plantillas = await loadMessageTemplates(sellerId);
  return <ClientesTable plantillas={plantillas} />;
}
