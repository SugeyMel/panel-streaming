import { notFound, redirect } from "next/navigation";
import { RenewalCheckout } from "@/components/services/RenewalCheckout";
import {
  customerScope,
  loadPaymentMethods,
  loadPlatforms,
  loadProducts,
  loadServices,
} from "@/lib/data/queries";

export default async function RenewServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const { customerId } = await customerScope();
  if (!customerId) redirect("/login");
  const [services, platforms] = await Promise.all([loadServices({ customerId }), loadPlatforms()]);
  const service = services.find((item) => item.id === serviceId);
  if (!service) notFound();
  const [products, methods] = await Promise.all([
    loadProducts(service.sellerId, true),
    loadPaymentMethods(service.sellerId),
  ]);
  const platform = platforms.find((item) => item.id === service.platformId);

  return <RenewalCheckout service={service} products={products} platform={platform} methods={methods} />;
}
