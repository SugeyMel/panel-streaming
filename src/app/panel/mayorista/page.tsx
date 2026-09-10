import { SellerWholesaleCatalog } from "@/components/panel/SellerWholesaleCatalog";
import { loadPlatforms, loadSupplierProducts } from "@/lib/data/queries";

export default async function SellerWholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>;
}) {
  const [{ producto }, products, platforms] = await Promise.all([
    searchParams,
    loadSupplierProducts(),
    loadPlatforms(),
  ]);
  const catalog = products.filter((row) => row.status === "active");

  return (
    <div className="@container min-w-0 space-y-3 @lg:space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F8FAFC] @lg:text-3xl">Mayorista</h1>
        <p className="mt-1 text-[12px] leading-snug text-[#94A3B8] @lg:max-w-2xl @lg:text-sm">
          El precio de la tarjeta es el costo por unidad al alquilar el pack. En detalles ves también el precio de 1
          unidad.
        </p>
      </div>
      <SellerWholesaleCatalog products={catalog} platforms={platforms} initialProductId={producto} />
    </div>
  );
}
