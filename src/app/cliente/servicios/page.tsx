import { PageHeader } from "@/components/ui/PageHeader";
import { ServiceCard } from "@/components/services/ServiceCard";
import { customerScope, loadPlatforms, loadServices } from "@/lib/data/queries";

export default async function CustomerServicesPage() {
  const { customerId } = await customerScope();
  const [services, platforms] = await Promise.all([
    loadServices({ customerId }),
    loadPlatforms(),
  ]);
  return (
    <div>
      <PageHeader title="Mis servicios" description="Tus suscripciones, fechas de vencimiento y estado." />
      <div className="grid gap-3 md:grid-cols-2">
        {services.map((subscription) => {
          const platform = platforms.find((item) => item.id === subscription.platformId);
          if (!platform) return null;
          return (
            <ServiceCard
              key={subscription.id}
              subscription={{ ...subscription, internalCost: 0 }}
              platform={platform}
              showRenewal
              href={`/cliente/servicios/${subscription.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}
