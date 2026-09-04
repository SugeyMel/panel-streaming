import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
import type { Platform } from "@/lib/types";

export function PlatformCard({
  platform,
  priceFrom,
  href = "/tienda/juan",
}: {
  platform: Platform;
  priceFrom: number;
  href?: string;
}) {
  return (
    <Card className="flex h-full flex-col items-center px-2.5 pb-3 pt-3 text-center">
      <PlatformLogo platform={platform} size={64} />
      <h3 className="mt-2 w-full truncate text-sm font-semibold text-white">
        {platform.name}
      </h3>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-400">
        {platform.tagline}
      </p>
      <p className="mt-2 text-xs text-slate-300">
        Desde <span className="font-semibold text-white">{formatCurrency(priceFrom)}</span>
      </p>
      <p className={`mt-1 text-[10px] font-medium ${platform.available ? "text-[#86EFAC]" : "text-[#FCD34D]"}`}>
        {platform.available ? "Disponible" : "Agotado"}
      </p>
      <Button href={href} variant="secondary" className="mt-2 min-h-8 w-full rounded-xl px-2 py-1.5 text-[11px]">
        Ver planes
      </Button>
    </Card>
  );
}
