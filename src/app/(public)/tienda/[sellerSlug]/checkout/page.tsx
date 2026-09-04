import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/store/CheckoutFlow";
import { getAppSession } from "@/lib/auth/get-session";
import { loadCustomerById, loadPlatforms, loadStorefront } from "@/lib/data/queries";
import { groupProductOffers } from "@/lib/selectors";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ producto?: string }>;
}) {
  const { sellerSlug } = await params;
  const { producto } = await searchParams;
  const [store, platforms, session] = await Promise.all([
    loadStorefront(sellerSlug),
    loadPlatforms(),
    getAppSession(),
  ]);
  if (!store) notFound();
  const loggedCustomer = session.customerId ? await loadCustomerById(session.customerId) : null;
  const lockCustomer = Boolean(
    session.role === "customer" && loggedCustomer && loggedCustomer.sellerId === store.seller.id,
  );
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
        customerName={lockCustomer ? loggedCustomer?.name ?? "" : ""}
        customerWhatsapp={lockCustomer ? loggedCustomer?.whatsapp ?? "" : ""}
        lockCustomer={lockCustomer}
      />
    </Suspense>
  );
}
