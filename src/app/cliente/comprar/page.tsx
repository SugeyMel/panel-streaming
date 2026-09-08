import { SellerStore } from "@/components/store/SellerStore";
import { customerScope, loadCustomerById, loadPlatforms, loadSellerById, loadStorefront } from "@/lib/data/queries";

export default async function CustomerBuyPage() {
  const { customerId } = await customerScope();
  const customer = await loadCustomerById(customerId);
  const [seller, platforms] = await Promise.all([
    loadSellerById(customer?.sellerId ?? null),
    loadPlatforms(),
  ]);
  const store = seller ? await loadStorefront(seller.slug) : null;

  if (!store) {
    return <p className="text-sm text-[#94A3B8]">No hay una tienda publicada para tu vendedor.</p>;
  }

  return (
    <div className="-mx-4 -mt-2 sm:-mx-6">
      <SellerStore
        seller={store.seller}
        products={store.products}
        platforms={platforms}
        checkoutHref="/cliente/checkout?producto="
        showPublicChrome={false}
      />
    </div>
  );
}
