import { PageHeader } from "@/components/ui/PageHeader";
import { CustomerAccessCenter } from "@/components/access/CustomerAccessCenter";
import { customerScope, loadPlatforms, loadServices } from "@/lib/data/queries";

export default async function CustomerAccessPage() {
  const { customerId } = await customerScope();
  const [services, platforms] = await Promise.all([
    loadServices({ customerId }),
    loadPlatforms(),
  ]);
  const mine = services
    .filter((item) => item.status === "activo" || item.status === "proximo_a_vencer")
    .map((item) => ({ ...item, internalCost: 0 }));
  const sellerId = mine[0]?.sellerId ?? "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Centro de acceso"
        description="Aquí verás el Gmail o usuario de cada servicio (Netflix, Max, etc.). Los códigos automáticos se conectarán después."
      />
      <CustomerAccessCenter
        services={mine}
        platforms={platforms}
        customerId={customerId ?? ""}
        sellerId={sellerId}
      />
    </div>
  );
}
