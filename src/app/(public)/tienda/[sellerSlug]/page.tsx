import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SellerStore } from "@/components/store/SellerStore";
import { getAppSession } from "@/lib/auth/get-session";
import { loadPlatforms, loadStorefront } from "@/lib/data/queries";

export default async function SellerStorePage({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}) {
  const { sellerSlug } = await params;
  const [store, platforms, session] = await Promise.all([
    loadStorefront(sellerSlug),
    loadPlatforms(),
    getAppSession(),
  ]);
  if (!store) notFound();
  const customerOfSeller = session.role === "customer" && Boolean(session.customerId);

  return (
    <Suspense>
      <SellerStore
        seller={store.seller}
        products={store.products}
        platforms={platforms}
        checkoutHref={`/tienda/${store.seller.slug}/checkout?producto=`}
        navHrefs={{
          home: `/tienda/${store.seller.slug}`,
          store: "#catalogo",
          orders: customerOfSeller ? "/cliente/pedidos" : "/pedido",
          help: customerOfSeller ? "/cliente/soporte" : "/login",
          account: customerOfSeller ? "/cliente/cuenta" : "/login",
        }}
      />
    </Suspense>
  );
}
