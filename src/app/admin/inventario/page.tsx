import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
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
        <DataTable
          rows={products}
          columns={[
            { key: "seller", header: "Vendedor", render: (row) => sellers.find((item) => item.id === row.sellerId)?.name ?? "—" },
            { key: "platform", header: "Plataforma", render: (row) => (
              <PlatformName
                platform={platforms.find((item) => item.id === row.platformId) ?? row.platformId}
                size="table"
              />
            ) },
            { key: "name", header: "Producto", render: (row) => row.name },
            { key: "stock", header: "Stock", render: (row) => row.stock },
            { key: "price", header: "Precio", render: (row) => formatCurrency(row.salePrice) },
            { key: "status", header: "Estado", render: (row) => (row.soldOut ? "Agotado" : "Disponible") },
          ]}
        />
      </Card>
    </div>
  );
}
