import { ProductCard } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/Button";
import { groupProductOffers } from "@/lib/selectors";
import type { Platform, Product, Seller } from "@/lib/types";

export function SellerStore({
  seller,
  products,
  platforms,
}: {
  seller: Seller;
  products: Product[];
  platforms: Platform[];
}) {
  const offers = groupProductOffers(products.filter((item) => item.active));
  const platformOf = (id: string) => platforms.find((item) => item.id === id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-sm text-cyan-300">{seller.businessName}</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Tienda de {seller.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Elige la plataforma y el plazo. Los precios son de este vendedor.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button href={`/login?next=/cliente`} variant="secondary">
          Entrar a mi cuenta
        </Button>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => {
          const platform = platformOf(offer.platformId);
          if (!platform) return null;
          return (
            <ProductCard
              key={offer.id}
              offer={offer}
              platform={platform}
              checkoutHref={`/tienda/${seller.slug}/checkout?producto=`}
            />
          );
        })}
      </div>
    </main>
  );
}
