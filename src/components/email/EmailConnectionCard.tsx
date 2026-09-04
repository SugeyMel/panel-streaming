import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmailStatusBadge } from "@/components/ui/StatusBadge";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { formatDate } from "@/lib/format";
import type { ConnectedEmailAccount, Platform } from "@/lib/types";

export function EmailConnectionCard({
  account,
  platforms,
}: {
  account: ConnectedEmailAccount;
  platforms: Platform[];
}) {
  const linked = platforms.filter((item) => account.linkedPlatformIds.includes(item.id));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{account.email}</p>
          <p className="mt-1 text-sm text-slate-400">
            {account.provider === "google" ? "Google" : "Microsoft"}
          </p>
        </div>
        <EmailStatusBadge status={account.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <span>Plataformas:</span>
        {linked.length ? (
          linked.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-[#253047] px-2 py-0.5 text-xs">
              <PlatformLogo platform={item} size="filter" />
              {item.name}
            </span>
          ))
        ) : (
          <span>Sin vincular</span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Última sincronización:{" "}
        {account.lastSyncAt ? formatDate(account.lastSyncAt) : "Sin datos"}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="h-8 px-3 py-1 text-xs">
          Reconectar
        </Button>
        <Button variant="ghost" className="h-8 px-3 py-1 text-xs">
          Desconectar
        </Button>
      </div>
    </Card>
  );
}
