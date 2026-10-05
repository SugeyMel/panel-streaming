import { AdminDirectProducts } from "@/components/admin/AdminDirectProducts";
import { prepareDirectSalesSeller } from "@/app/actions/admin-customers";
import { DIRECT_ASSIGNED_PRODUCT_NAME } from "@/lib/direct-sales";
import { loadPlatforms, loadProducts, loadSellerById } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminDirectProductsPage() {
  const ready = await prepareDirectSalesSeller();
  if (!ready.ok) {
    return <p className="text-sm text-[#F87171]">{ready.error}</p>;
  }

  const [seller, products, platforms] = await Promise.all([
    loadSellerById(ready.sellerId),
    loadProducts(ready.sellerId),
    loadPlatforms(),
  ]);
  if (!seller) {
    return <p className="text-sm text-[#F87171]">No se pudo abrir la tienda de venta directa.</p>;
  }

  const visible = products.filter((item) => item.name !== DIRECT_ASSIGNED_PRODUCT_NAME);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F8FAFC] lg:text-3xl">Productos venta directa</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Estos productos los ven en su tienda los clientes creados como Venta directa (mío).
        </p>
      </div>
      <AdminDirectProducts seller={seller} products={visible} platforms={platforms} />
    </div>
  );
}
