import { MayoristaBoard, type MayoristaTab } from "@/components/admin/MayoristaBoard";
import { loadPlatforms, loadSupplierProducts, loadSuppliers } from "@/lib/data/queries";

function parseTab(value: string | undefined): MayoristaTab {
  if (value === "plataformas" || value === "proveedores") return value;
  return "catalogo";
}

export default async function AdminMayoristaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [suppliers, products, platforms] = await Promise.all([
    loadSuppliers(),
    loadSupplierProducts(),
    loadPlatforms(),
  ]);
  return <MayoristaBoard tab={parseTab(tab)} products={products} platforms={platforms} suppliers={suppliers} />;
}
