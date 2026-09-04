import { Card } from "@/components/ui/Card";
import { SupportStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { SupportRequest } from "@/lib/types";

export function SupportTicket({ ticket, customerName }: { ticket: SupportRequest; customerName: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{customerName}</p>
          <h3 className="mt-1 font-semibold text-white">{ticket.subject}</h3>
        </div>
        <SupportStatusBadge status={ticket.status} />
      </div>
      <p className="mt-3 text-sm text-slate-300">{ticket.message}</p>
      <p className="mt-3 text-xs text-slate-500">{formatDate(ticket.createdAt)}</p>
    </Card>
  );
}
