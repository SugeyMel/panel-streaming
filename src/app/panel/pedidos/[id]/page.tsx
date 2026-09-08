import { notFound } from "next/navigation";
import { DeliverServiceForm } from "@/components/orders/DeliverServiceForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { PlatformName } from "@/components/ui/PlatformLogo";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { OrderReviewButtons } from "@/components/orders/OrderReviewButtons";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { whatsappParaMostrar } from "@/lib/clientes";
import { loadCustomers, loadOrders, loadPlatforms, loadProducts, loadOrderReceiptUrl, loadServices, loadStreamingAccounts, loadMessageTemplates, panelScope } from "@/lib/data/queries";
import { waLink, supportMessage } from "@/lib/whatsapp";

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { sellerId } = await panelScope();
  const [orders, customers, platforms, products, services, accounts, plantillas] = await Promise.all([
    loadOrders({ sellerId }),
    loadCustomers(sellerId),
    loadPlatforms(),
    loadProducts(sellerId),
    loadServices({ sellerId }),
    loadStreamingAccounts(sellerId),
    loadMessageTemplates(sellerId),
  ]);
  const order = orders.find((item) => item.id === id);
  if (!order) notFound();
  const customer = customers.find((item) => item.id === order.customerId);
  const product = products.find((item) => item.id === order.productId);
  const platform = platforms.find((item) => item.id === order.platformId);
  const service = services.find((item) => item.orderId === order.id)
    ?? services.find((item) => item.productId === order.productId && item.customerId === order.customerId);

  const receiptUrl = await loadOrderReceiptUrl(order.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Pedido ${order.code}`} action={<StatusBadge status={order.status} />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-5 text-sm text-slate-300">
          <p>Cliente: <span className="text-white">{customer?.name}</span></p>
          <p>WhatsApp: <span className="text-white">{whatsappParaMostrar(order.whatsapp || customer?.whatsapp || "") || "—"}</span></p>
          <p className="flex items-center gap-2">
            Plataforma: {platform ? <PlatformName platform={platform} size="table" className="text-white" /> : <span className="text-white">—</span>}
          </p>
          <p>Producto: <span className="text-white">{product?.name}</span></p>
          <p>Monto: <span className="text-white">{formatCurrency(order.amount)}</span></p>
          <p>Costo interno: <span className="text-white">{formatCurrency(order.internalCost)}</span></p>
          <p>Fecha: <span className="text-white">{formatDate(order.createdAt)}</span></p>
          {customer ? (
            <a className="inline-block text-cyan-300" href={waLink(customer.whatsapp, supportMessage(customer.name))} target="_blank" rel="noreferrer">
              Contactar por WhatsApp
            </a>
          ) : null}
        </Card>
        <Card className="p-5">
          <CardHeader title="Pago y comprobante" />
          {receiptUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">El cliente envió este voucher. Revísalo y aprueba o rechaza.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptUrl} alt="Voucher de pago" className="max-h-80 rounded-xl object-contain" />
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-cyan-300">
                Abrir imagen
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aún no hay voucher. Cuando el cliente pulse Ya pagué con foto, aparece aquí.</p>
          )}
        </Card>
      </div>
      <Card className="p-5">
        <OrderProgress currentStep={order.status === "entregado" ? 3 : order.status === "pago_enviado" ? 1 : order.status === "pago_aprobado" ? 2 : 0} />
      </Card>
      <OrderReviewButtons orderId={order.id} status={order.status} />
      {order.status === "pago_aprobado" || order.status === "entregado" ? (
        <Card className="p-5">
          <CardHeader title={order.status === "entregado" ? "Servicio entregado" : "Entregar servicio"} />
          <DeliverServiceForm
            orderId={order.id}
            customerName={customer?.name ?? "cliente"}
            customerWhatsapp={order.whatsapp || customer?.whatsapp || ""}
            platformName={platform?.name ?? "plataforma"}
            productName={product?.name ?? "producto"}
            delivered={order.status === "entregado"}
            accounts={accounts.filter((item) => item.platformId === (order.platformId || product?.platformId) && item.status !== "inactive")}
            initialEmail={service?.platformEmail}
            initialPassword={service?.accessPassword}
            initialProfile={service?.accessProfile}
            initialNote={order.deliveryNote || service?.notes}
            initialAccountId={service?.accountId}
            plantillas={plantillas}
          />
        </Card>
      ) : null}
    </div>
  );
}
