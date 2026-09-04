import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PlatformMark } from "@/components/ui/PlatformMark";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SubscriptionStatusBadge } from "@/components/ui/StatusBadge";
import { CheckIcon } from "@/components/icons";
import { daysLeftLabel, formatDate, serviceStatusFromDates } from "@/lib/format";
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
      <ScreenHeader title="Detalle del servicio" backHref="/cliente" />
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <PlatformMark name={platform.name} from={platform.accentFrom} to={platform.accentTo} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[#F8FAFC]">{platform.name}</h2>
              <SubscriptionStatusBadge status={status} />
            </div>
            {product ? <p className="mt-2 text-sm text-[#94A3B8]">{product.name}</p> : null}
            <p className="mt-3 text-sm text-[#F8FAFC]">Vence {formatDate(service.endDate)}</p>
            <span className="mt-2 inline-flex rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
              {daysLeftLabel(service.endDate)}
            </span>
          </div>
        </div>
      </Card>

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
