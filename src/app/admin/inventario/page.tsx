import { AdminInventoryTable } from "@/components/admin/AdminInventoryTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadPlatforms, loadProducts, loadSellers } from "@/lib/data/queries";

export default async function AdminInventoryPage() {
  const [products, sellers, platforms] = await Promise.all([
    loadProducts(),
    loadSellers(),
    loadPlatforms(),
  ]);
  return (
    <div>
      <PageHeader title="Inventario" description="Stock de productos por vendedor." />
      <Card>
        <AdminInventoryTable
          products={products}
          sellers={sellers.map((item) => ({ id: item.id, name: item.name }))}
          platforms={platforms}
        />
      </Card>
    </div>
  );
}
