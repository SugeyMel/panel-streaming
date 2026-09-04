import { SuppliersManager } from "@/components/admin/SuppliersManager";
import { loadPlatforms, loadSupplierProducts, loadSuppliers } from "@/lib/data/queries";

export default async function AdminSuppliersPage() {
  const [suppliers, products, platforms] = await Promise.all([
    loadSuppliers(),
    loadSupplierProducts(),
    loadPlatforms(),
  ]);
  return (
    <SuppliersManager
      suppliers={suppliers as never}
      products={products as never}
      platforms={platforms}
    />
  );
}
