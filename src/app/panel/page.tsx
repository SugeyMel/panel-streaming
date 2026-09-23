import { SellerCodeLookup } from "@/components/panel/SellerCodeLookup";
import { SellerWholesaleCatalog } from "@/components/panel/SellerWholesaleCatalog";
import { loadPlatforms, loadSupplierProducts, panelScope } from "@/lib/data/queries";

export default async function SellerConsultasPage() {
  // panelScope() se mantiene: valida la sesión y prepara el diseño inicial del vendedor.
  await panelScope();
  const [platforms, supplierProducts] = await Promise.all([loadPlatforms(), loadSupplierProducts()]);
  // Productos que el administrador publicó/habilitó para los vendedores.
  const catalog = supplierProducts.filter((row) => row.status === "active");

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <SellerCodeLookup platforms={platforms} />

      <section className="@container min-w-0 rounded-2xl border border-[#253047] bg-[#0B111C] p-4 md:p-5">
        <h2 className="text-lg leading-tight font-bold text-[#F8FAFC] md:text-2xl">Productos disponibles</h2>
        <p className="mt-1 mb-4 text-[13px] leading-snug text-[#94A3B8]">
          Cuentas y servicios disponibles para tu negocio.
        </p>
        {catalog.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#253047] px-4 py-10 text-center text-sm text-[#94A3B8]">
            No hay productos disponibles en este momento.
          </p>
        ) : (
          <SellerWholesaleCatalog products={catalog} platforms={platforms} />
        )}
      </section>
    </div>
  );
}
