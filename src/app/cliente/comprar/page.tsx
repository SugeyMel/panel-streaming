import { ProductCard } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  customerScope,
  loadCustomerById,
  loadPlatforms,
  loadSellerById,
  loadStorefront,
} from "@/lib/data/queries";
import { groupProductOffers } from "@/lib/selectors";

export default async function CustomerBuyPage() {
  const { customerId } = await customerScope();
  const customer = await loadCustomerById(customerId);
  const [seller, platforms] = await Promise.all([
    loadSellerById(customer?.sellerId ?? null),
    loadPlatforms(),
  ]);
  const store = seller ? await loadStorefront(seller.slug) : null;
  const offers = groupProductOffers((store?.products ?? []).filter((item) => item.active));

  return (
    <div>
      <PageHeader
        title="Comprar"
        description={`Productos disponibles de ${seller?.businessName ?? "tu vendedor"}.`}
        action={
          <Button href={seller ? `/tienda/${seller.slug}` : "/"} variant="secondary">
            Abrir tienda
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => {
          const platform = platforms.find((item) => item.id === offer.platformId);
          if (!platform) return null;
          return (
            <ProductCard
              key={offer.id}
              offer={{ ...offer, internalCost: 0, variants: offer.variants.map((item) => ({ ...item, internalCost: 0 })) }}
              platform={platform}
              checkoutHref={`/tienda/${seller?.slug}/checkout?producto=`}
            />
          );
        })}
      </div>
    </div>
  );
}
