import { Card } from "@/components/ui/Card";
import { PlatformMark } from "@/components/ui/PlatformMark";
import { SubscriptionStatusBadge } from "@/components/ui/StatusBadge";
import { daysLeftLabel, formatCurrency, formatDate, serviceStatusFromDates } from "@/lib/format";
import type { Platform, Plan, Subscription } from "@/lib/types";
import { RenewalButtons } from "@/components/services/RenewalButtons";

export function ServiceCard({
  subscription,
  platform,
  plan,
  showInternal = false,
  showRenewal = false,
  href,
}: {
  subscription: Subscription;
  platform: Platform;
  plan?: Plan;
  showInternal?: boolean;
  showRenewal?: boolean;
  href?: string;
}) {
  const status = serviceStatusFromDates(subscription.endDate, subscription.status);
  const title = plan?.name ? `${platform.name} · ${plan.name}` : platform.name;

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
