import { Card } from "@/components/ui/Card";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { customerScope, loadOrders } from "@/lib/data/queries";

export default async function CustomerOrdersPage() {
  const { customerId } = await customerScope();
  const orders = await loadOrders({ customerId });
  const delivered = orders.filter((item) => item.status === "entregado");
  return (
    <div className="space-y-4">
      <PageHeader title="Mis pedidos" />
      {delivered.map((item) => (
        <Card key={item.id} className="border border-cyan-400/30 p-4 text-sm text-slate-200">
          <p className="font-medium text-white">Servicio entregado · {item.code}</p>
          <p className="mt-1">{item.deliveryNote || "El acceso ya está en Centro de acceso."}</p>
          <a href="/cliente/acceso" className="mt-2 inline-block text-cyan-300">Ver acceso</a>
        </Card>
      ))}
      <Card>
        <OrdersTable
          orders={orders.map((item) => ({ ...item, internalCost: 0 }))}
          empty="Aún no hay pedidos en esta cuenta. Si compraste en la tienda con otro número, pide a tu vendedor que te cree el acceso con el mismo WhatsApp."
        />
      </Card>
    </div>
  );
}
