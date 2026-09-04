import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { Button } from "@/components/ui/Button";
import { PlatformLogo, PlatformName } from "@/components/ui/PlatformLogo";
import { ChevronRightIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { expiryLabel, expiryLevel } from "@/lib/selectors";
import {
  loadCustomers,
  loadFinance,
  loadOrders,
  loadPlatforms,
  loadServices,
  panelScope,
} from "@/lib/data/queries";

export default async function SellerDashboardPage() {
  const { session, sellerId } = await panelScope();
  const [finance, orders, services, customers, platforms] = await Promise.all([
    loadFinance(sellerId),
    loadOrders({ sellerId }),
    loadServices({ sellerId }),
    loadCustomers(sellerId),
    loadPlatforms(),
  ]);
  const pendingReceipts = orders.filter((item) =>
    ["pendiente_pago", "pago_enviado"].includes(item.status),
  );
  const alerts = services
    .map((subscription) => ({ subscription, level: expiryLevel(subscription) }))
    .filter((item) => item.level);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-[#F8FAFC] lg:text-3xl">
          Hola, {session.name || "vendedor"} 👋
        </h1>
        <p className="mt-1 text-sm text-[#94A3B8]">Este es el resumen de tu negocio.</p>
      </div>
      {pendingReceipts.length > 0 ? (
        <Card className="border border-[#F59E0B]/40 p-4 text-sm text-[#F59E0B]">
          Tienes {pendingReceipts.length} pago(s) por revisar. Ábrelos en{" "}
          <a href="/panel/comprobantes" className="underline">
            Comprobantes
          </a>{" "}
          o en Pedidos.
        </Card>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Ventas (mes)" value={formatCurrency(finance.sales)} />
        <MetricCard label="Ganancia" value={formatCurrency(finance.netProfit)} />
        <MetricCard label="Servicios activos" value={String(finance.activeServices)} />
        <MetricCard label="Por vencer" value={String(finance.expiringServices)} tone="warning" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">
            Renovaciones pendientes
          </h2>
          <Link href="/panel/pedidos" className="inline-flex items-center text-sm text-[#38BDF8]">
            Ver todos <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {pendingReceipts.length === 0 ? (
            <Card className="p-4 text-sm text-[#94A3B8]">No hay pagos pendientes.</Card>
          ) : (
            pendingReceipts.slice(0, 6).map((item) => {
              const customer = customers.find((row) => row.id === item.customerId);
              const platform = platforms.find((row) => row.id === item.platformId);
              const initial = (customer?.name.trim()[0] ?? "?").toUpperCase();
              return (
                <Card key={item.id} className="flex items-center gap-3 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#172033] text-sm font-semibold text-[#F8FAFC]">
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#F8FAFC]">{customer?.name ?? "Cliente"}</p>
                    <p className="truncate text-xs text-[#94A3B8]">
                      <PlatformName
                        platform={platform ?? item.platformId}
                        label={`${platform?.name ?? item.code} · ${formatCurrency(item.amount)}`}
                        size="table"
                      />
                    </p>
                  </div>
                  <Button
                    href={`/panel/pedidos/${item.id}`}
                    variant="secondary"
                    className="h-9 min-h-9 rounded-xl border-0 bg-[#8B5CF6] px-3 text-xs text-white hover:bg-[#7c3aed]"
                  >
                    Revisar
                  </Button>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
          <Button href="/panel/ventas" variant="secondary" className="w-full lg:w-auto">
            Nueva venta
          </Button>
          <Button href="/panel/clientes" variant="secondary" className="w-full lg:w-auto">
            Nuevo cliente
          </Button>
          <Button href="/panel/servicios" variant="secondary" className="w-full lg:w-auto">
            Nuevo servicio
          </Button>
          <Button href="/panel/finanzas" variant="secondary" className="w-full lg:w-auto">
            Registrar gasto
          </Button>
        </div>
      </div>

      <Card className="hidden lg:block">
        <CardHeader title="Próximos vencimientos" />
        <div className="space-y-3 p-5">
          {alerts.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No hay vencimientos próximos.</p>
          ) : (
            alerts.map(({ subscription, level }) => (
              <p key={subscription.id} className="flex items-center gap-2 text-sm text-[#F8FAFC]">
                <PlatformLogo
                  platform={platforms.find((item) => item.id === subscription.platformId) ?? subscription.platformId}
                  size="table"
                />
                <span>
                  {platforms.find((item) => item.id === subscription.platformId)?.name} de{" "}
                  {customers.find((item) => item.id === subscription.customerId)?.name}.{" "}
                  {level ? expiryLabel(level) : ""}.
                </span>
              </p>
            ))
          )}
        </div>
      </Card>
      <Card className="hidden lg:block">
        <CardHeader title="Actividad reciente" />
        <OrdersTable orders={orders} actionHref={(order) => `/panel/pedidos/${order.id}`} />
      </Card>
    </div>
  );
}
