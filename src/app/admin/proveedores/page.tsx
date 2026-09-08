import { MayoristaBoard } from "@/components/admin/MayoristaBoard";
import { loadPlatforms, loadSupplierProducts, loadSuppliers } from "@/lib/data/queries";

export default async function AdminSuppliersPage() {
  const [suppliers, products, platforms] = await Promise.all([
    loadSuppliers(),
    loadSupplierProducts(),
    loadPlatforms(),
  ]);
  return (
    <MayoristaBoard tab="proveedores" products={products} platforms={platforms} suppliers={suppliers} />
  );
}
