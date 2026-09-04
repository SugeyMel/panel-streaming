import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/format";
import { loadSupplierProducts, loadSuppliers } from "@/lib/data/queries";

export default async function SellerWholesalePage() {
  const [suppliers, products] = await Promise.all([loadSuppliers(), loadSupplierProducts()]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Mayorista"
        description="Consulta de productos mayoristas. Sin pagos automáticos a proveedores."
      />
      <Card>
        <DataTable
          rows={products as { id: string; name: string; wholesale_price: number; status: string }[]}
          columns={[
            { key: "name", header: "Producto", render: (row) => row.name },
            { key: "price", header: "Precio mayorista", render: (row) => formatCurrency(Number(row.wholesale_price)) },
            { key: "status", header: "Estado", render: (row) => row.status },
          ]}
        />
      </Card>
      <p className="text-xs text-slate-500">{suppliers.length} proveedores visibles para vendedores autorizados.</p>
    </div>
  );
}
