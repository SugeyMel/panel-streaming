import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CustomerSquareLogo, customerBrandSurfaceStyle } from "@/components/cliente/CustomerSquareLogo";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { CheckIcon } from "@/components/icons";
import { daysLeftLabel, formatDate, serviceStatusFromDates, subscriptionStatusLabel } from "@/lib/format";
import {
  customerScope,
  loadPlatforms,
  loadProducts,
  loadServices,
} from "@/lib/data/queries";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customerId } = await customerScope();
  if (!customerId) redirect("/login");
  const [services, platforms] = await Promise.all([
    loadServices({ customerId }),
    loadPlatforms(),
  ]);
  const service = services.find((item) => item.id === id);
  if (!service) notFound();
  const platform = platforms.find((item) => item.id === service.platformId);
  if (!platform) notFound();
  const products = await loadProducts(service.sellerId, true);
  const product = products.find((item) => item.id === service.productId);
  const status = serviceStatusFromDates(service.endDate, service.status);
  const info = [
    service.accessProfile ? { label: "Perfil", value: service.accessProfile } : null,
    service.platformEmail ? { label: "Correo", value: service.platformEmail } : null,
    product ? { label: "Plan", value: `${product.durationDays} días` } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const declined = service.renewalIntent === "decline";
  const renewing = service.renewalIntent === "renew";

  return (
    <div className="space-y-5">
      <ScreenHeader title="Detalle del servicio" backHref="/cliente/servicios" />
      <article className="overflow-hidden rounded-2xl border p-4" style={customerBrandSurfaceStyle(platform)}>
        <div className="flex items-start gap-4">
          <CustomerSquareLogo platform={platform} title={platform.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-white">{platform.name}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  status === "activo"
                    ? "bg-[#16A34A] text-white"
                    : status === "proximo_a_vencer"
                      ? "bg-[#FBBF24] text-[#1C1917]"
                      : status === "cancelado"
                        ? "bg-[#7F1D1D] text-white"
                        : "bg-[#DC2626] text-white"
                }`}
              >
                {status === "proximo_a_vencer" ? "Por vencer" : subscriptionStatusLabel[status]}
              </span>
            </div>
            {product ? <p className="mt-2 text-sm text-white/75">{product.name}</p> : null}
            <p className="mt-3 text-sm text-white">Vence {formatDate(service.endDate)}</p>
            <span className="mt-2 inline-flex rounded-full bg-[#F59E0B]/20 px-2.5 py-1 text-xs font-medium text-[#FBBF24]">
              {daysLeftLabel(service.endDate)}
            </span>
          </div>
        </div>
      </article>

      {info.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#94A3B8] uppercase">Información</p>
          <Card className="divide-y divide-[#253047]">
            {info.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3.5 text-sm">
                <span className="text-[#94A3B8]">{row.label}</span>
                <span className="text-[#F8FAFC]">{row.value}</span>
              </div>
            ))}
          </Card>
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-sm font-semibold text-[#F8FAFC]">¿Qué deseas hacer?</p>
        {declined ? (
          <p className="text-sm text-[#94A3B8]">Se procede con la finalización de tu servicio.</p>
        ) : renewing ? (
          <Link
            href={`/cliente/renovar/${service.id}`}
            className="flex items-center gap-3 rounded-[16px] border border-[#22C55E]/40 bg-[#22C55E]/10 p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E] text-white">
              <CheckIcon className="h-5 w-5" />
            </span>
            <span className="flex-1 text-left">
              <span className="block font-semibold text-[#22C55E]">Enviar comprobante</span>
              <span className="text-sm text-[#94A3B8]">Tu renovación está en revisión</span>
            </span>
            <span className="text-[#94A3B8]">›</span>
          </Link>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/cliente/renovar/${service.id}`}
              className="flex items-center gap-3 rounded-[16px] border border-[#22C55E]/40 bg-[#22C55E]/10 p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E] text-white">
                <CheckIcon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-left">
                <span className="block font-semibold text-[#22C55E]">Sí renuevo</span>
                <span className="text-sm text-[#94A3B8]">Continúa disfrutando sin interrupciones</span>
              </span>
              <span className="text-[#94A3B8]">›</span>
            </Link>
            <Link
              href={`/cliente/servicios/${service.id}/no-renovar`}
              className="flex items-center gap-3 rounded-[16px] border border-[#EF4444]/40 bg-[#EF4444]/10 p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EF4444] text-white text-lg leading-none">
                ✕
              </span>
              <span className="flex-1 text-left">
                <span className="block font-semibold text-[#EF4444]">No renuevo</span>
                <span className="text-sm text-[#94A3B8]">Se cancelará al llegar la fecha de vencimiento</span>
              </span>
              <span className="text-[#94A3B8]">›</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
