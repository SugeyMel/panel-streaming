import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/store/CheckoutFlow";
import {
  customerScope,
  loadCustomerById,
  loadPaymentMethods,
  loadPlatforms,
  loadSellerById,
  loadStorefront,
} from "@/lib/data/queries";
import { groupProductOffers } from "@/lib/selectors";

export default async function CustomerCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>;
}) {
  const { producto } = await searchParams;
  const { customerId } = await customerScope();
  if (!customerId) redirect("/login");
  const customer = await loadCustomerById(customerId);
  const seller = await loadSellerById(customer?.sellerId ?? null);
  if (!seller) notFound();
  const [store, platforms, methods] = await Promise.all([
    loadStorefront(seller.slug),
    loadPlatforms(),
    loadPaymentMethods(seller.id),
  ]);
  if (!store) notFound();
  const product = producto
    ? store.products.find((item) => item.id === producto)
    : store.products[0];
  if (!product) notFound();
  const platform = platforms.find((item) => item.id === product.platformId);
  const relatedProducts =
    groupProductOffers(store.products).find((offer) =>
      offer.variants.some((item) => item.id === product.id),
    )?.variants ?? [product];

  return (
    <Suspense>
      <CheckoutFlow
        seller={store.seller}
        product={product}
        platform={platform}
        relatedProducts={relatedProducts}
        methods={methods}
        customerName={customer?.name ?? ""}
        customerWhatsapp={customer?.whatsapp ?? ""}
        lockCustomer
      />
    </Suspense>
  );
}
