import { Card } from "@/components/ui/Card";
import { PlatformMark } from "@/components/ui/PlatformMark";
import { SubscriptionStatusBadge } from "@/components/ui/StatusBadge";
import { CustomerSquareLogo, customerBrandSurfaceStyle } from "@/components/cliente/CustomerSquareLogo";
import { daysLeftLabel, formatCurrency, formatDate, serviceStatusFromDates, subscriptionStatusLabel } from "@/lib/format";
import type { Platform, Plan, Subscription, SubscriptionStatus } from "@/lib/types";
import { RenewalButtons } from "@/components/services/RenewalButtons";

const STATUS_PILL: Record<SubscriptionStatus, string> = {
  activo: "bg-[#16A34A] text-white",
  proximo_a_vencer: "bg-[#FBBF24] text-[#1C1917]",
  vencido: "bg-[#DC2626] text-white",
  suspendido: "bg-[#F59E0B] text-[#1C1917]",
  cancelado: "bg-[#7F1D1D] text-white",
};

export function ServiceCard({
  subscription,
  platform,
  plan,
  showInternal = false,
  showRenewal = false,
  branded = false,
  href,
}: {
  subscription: Subscription;
  platform: Platform;
  plan?: Plan;
  showInternal?: boolean;
  showRenewal?: boolean;
  branded?: boolean;
  href?: string;
}) {
  const status = serviceStatusFromDates(subscription.endDate, subscription.status);
  const title = plan?.name ? `${platform.name} · ${plan.name}` : platform.name;

  if (branded) {
    const body = (
      <div className="flex items-start gap-3">
        <CustomerSquareLogo platform={platform} title={title} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold text-white">{title}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[status]}`}>
              {status === "proximo_a_vencer" ? "Por vencer" : subscriptionStatusLabel[status]}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-white/90">Vence {formatDate(subscription.endDate)}</p>
          <span
            className="mt-2 inline-flex rounded-full bg-[#F59E0B]/20 px-2.5 py-1 text-[11px] font-medium text-[#FBBF24]"
            suppressHydrationWarning
          >
            {daysLeftLabel(subscription.endDate)}
          </span>
        </div>
      </div>
    );

    return (
      <article
        className="overflow-hidden rounded-2xl border p-3.5"
        style={customerBrandSurfaceStyle(platform)}
      >
        {href ? (
          <a href={href} className="block">
            {body}
          </a>
        ) : (
          body
        )}
        {showInternal ? (
          <p className="mt-3 text-xs text-white/70">
            {formatCurrency(subscription.salePrice)} · Costo {formatCurrency(subscription.internalCost)}
          </p>
        ) : null}
        {showRenewal ? <RenewalButtons service={subscription} /> : null}
      </article>
    );
  }

  const body = (
    <div className="flex items-start gap-3">
      <PlatformMark name={platform.name} from={platform.accentFrom} to={platform.accentTo} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-[#F8FAFC]">{title}</h3>
          <SubscriptionStatusBadge status={status} />
        </div>
        <p className="mt-2 text-sm text-[#F8FAFC]">Vence {formatDate(subscription.endDate)}</p>
        <span className="mt-2 inline-flex rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
          {daysLeftLabel(subscription.endDate)}
        </span>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      {href ? (
        <a href={href} className="block">
          {body}
        </a>
      ) : (
        body
      )}
      {showInternal ? (
        <p className="mt-3 text-xs text-[#94A3B8]">
          {formatCurrency(subscription.salePrice)} · Costo {formatCurrency(subscription.internalCost)}
        </p>
      ) : null}
      {showRenewal ? <RenewalButtons service={subscription} /> : null}
    </Card>
  );
}
