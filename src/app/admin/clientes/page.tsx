import { Card } from "@/components/ui/Card";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadCustomerRows } from "@/lib/data/queries";

export default async function AdminCustomersPage() {
  const rows = await loadCustomerRows();
  return (
    <div>
      <PageHeader title="Clientes" description="Todos los clientes de todos los vendedores." />
      <Card>
        <CustomerTable rows={rows} showSeller hrefFor={() => `/admin/clientes`} />
      </Card>
    </div>
  );
}
