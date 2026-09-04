import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { MiniStat } from "@/components/ui/MiniStat";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ChevronRightIcon } from "@/components/icons";
import { expiryLevel } from "@/lib/selectors";
import {
  customerScope,
  loadCustomerById,
  loadOrders,
  loadPlatforms,
  loadServices,
} from "@/lib/data/queries";

export default async function CustomerHomePage() {
  const { customerId } = await customerScope();
  const [customer, services, orders, platforms] = await Promise.all([
    loadCustomerById(customerId),
    loadServices({ customerId }),
    loadOrders({ customerId }),
    loadPlatforms(),
  ]);
  const listed = services.filter((item) => item.status !== "cancelado");
  const expiring = listed.filter((item) => expiryLevel(item));
  const pending = orders.filter((item) =>
    ["pendiente_pago", "pago_enviado"].includes(item.status),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-[#F8FAFC] lg:text-3xl">
          Hola, {customer?.name ?? "cliente"} 👋
        </h1>
        <p className="mt-1 text-sm text-[#94A3B8]">Administra tus servicios y renovaciones.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MiniStat label="Servicios" value={listed.length} />
        <MiniStat label="Por vencer" value={expiring.length} tone="warning" />
        <MiniStat label="Pendientes" value={pending.length} tone="sky" />
      </div>

      {orders.filter((item) => item.status === "entregado").map((item) => (
        <Card key={item.id} className="border border-[#38BDF8]/30 p-4 text-sm text-[#F8FAFC]">
          <p className="font-medium">Servicio entregado · {item.code}</p>
          <p className="mt-1 text-[#94A3B8]">
            {item.deliveryNote || "Tu vendedor ya entregó el acceso. Ábrelo en Centro de acceso."}
          </p>
          <a href="/cliente/acceso" className="mt-2 inline-block text-[#38BDF8]">
            Ver acceso
          </a>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#F8FAFC]">Mis servicios</h2>
        <Link href="/cliente/servicios" className="inline-flex items-center text-sm text-[#38BDF8]">
          Ver todos <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {listed.map((subscription) => {
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

      <Card className="hidden lg:block">
        <CardHeader title="Pedidos recientes" />
        <OrdersTable
          orders={orders.map((item) => ({ ...item, internalCost: 0 }))}
          empty="Aún no hay pedidos en esta cuenta."
        />
      </Card>
    </div>
  );
}
