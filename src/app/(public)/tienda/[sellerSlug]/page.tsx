import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SellerStore } from "@/components/store/SellerStore";
import { loadPlatforms, loadStorefront } from "@/lib/data/queries";

export default async function SellerStorePage({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}) {
  const { sellerSlug } = await params;
  const [store, platforms] = await Promise.all([loadStorefront(sellerSlug), loadPlatforms()]);
  if (!store) notFound();

  return (
    <Suspense>
      <SellerStore seller={store.seller} products={store.products} platforms={platforms} />
    </Suspense>
  );
}
