import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ServiceCard } from "@/components/services/ServiceCard";
import { formatDate } from "@/lib/format";
import { waLink, renewalMessage, supportMessage } from "@/lib/whatsapp";
import {
  loadCustomers,
  loadOrders,
  loadPlatforms,
  loadServices,
  panelScope,
} from "@/lib/data/queries";

export default async function SellerCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { sellerId } = await panelScope();
  const [customers, services, orders, platforms] = await Promise.all([
    loadCustomers(sellerId),
    loadServices({ sellerId, customerId: id }),
    loadOrders({ sellerId, customerId: id }),
    loadPlatforms(),
  ]);
  const customer = customers.find((item) => item.id === id);
  if (!customer || (sellerId && customer.sellerId !== sellerId)) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Cliente: ${customer.name}`} action={<CustomerStatusBadge status={customer.status} />} />
      <Card className="grid gap-3 p-5 text-sm text-slate-300 sm:grid-cols-2">
        <p>WhatsApp: <span className="text-white">{customer.whatsapp}</span></p>
        <p>Correo: <span className="text-white">{customer.email}</span></p>
        <p>Registro: <span className="text-white">{formatDate(customer.registeredAt)}</span></p>
        <a className="text-cyan-300" href={waLink(customer.whatsapp, supportMessage(customer.name))} target="_blank" rel="noreferrer">
          Contactar
        </a>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((subscription) => {
          const platform = platforms.find((item) => item.id === subscription.platformId);
          if (!platform) return null;
          return (
            <div key={subscription.id}>
              <ServiceCard subscription={subscription} platform={platform} showInternal />
              <a
                className="mt-2 inline-block text-xs text-cyan-300"
                href={waLink(
                  customer.whatsapp,
                  renewalMessage(customer.name, platform.name, formatDate(subscription.endDate)),
                )}
                target="_blank"
                rel="noreferrer"
              >
                Recordar vencimiento
              </a>
            </div>
          );
        })}
      </div>
      <Card>
        <CardHeader title="Pedidos" />
        <OrdersTable orders={orders} actionHref={(order) => `/panel/pedidos/${order.id}`} />
      </Card>
    </div>
  );
}
