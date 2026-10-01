"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideCodeApprovalAction } from "@/app/actions/code-controls";
import type { CodeApprovalView } from "@/lib/code-controls";

function limaTime(ms: number) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

/** Solicitudes de Disney Premium / Estándar que esperan Aprobar o Rechazar. */
export function CodeApprovalAlerts({ items }: { items: CodeApprovalView[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  if (!items.length) return null;

  async function decide(id: string, decision: "approved" | "rejected") {
    setPendingId(id);
    try {
      await decideCodeApprovalAction(id, decision);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="mb-3 rounded-2xl border border-red-500/50 bg-red-950/80 px-4 py-3">
      <p className="text-sm font-bold text-red-100">Solicitudes de código esperando tu aprobación</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-black/30 px-3 py-2 text-sm text-[#FECACA]">
            <p>
              <span className="font-semibold text-white">{item.platformName}</span>
              {" · "}
              {item.email}
            </p>
            <p className="mt-0.5 text-xs text-red-100/80">
              {item.requesterKind === "cliente" ? "Cliente" : "Vendedor"}: {item.requesterName} · {limaTime(item.createdAt)}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => decide(item.id, "approved")}
                className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Aprobar
              </button>
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => decide(item.id, "rejected")}
                className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
