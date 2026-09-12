"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { orderStatusLabel } from "@/lib/format";
import {
  getSeenAlertsServerSnapshot,
  getSeenAlertsSnapshot,
  markAlertsSeen,
  subscribeSeenAlerts,
} from "@/lib/seen-alerts";
import type { OrderStatus } from "@/lib/types";

export type HeaderAlert = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
};

export type SellerBellAlert = {
  id: string;
  code: string;
  customerName?: string;
  status: OrderStatus;
};

export function AlertsBell({
  alerts,
  footerHref,
  footerLabel,
  empty = "No hay avisos.",
  wiggle = false,
  tone = "dark",
}: {
  alerts: HeaderAlert[];
  footerHref: string;
  footerLabel: string;
  empty?: string;
  wiggle?: boolean;
  tone?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const [stopped, setStopped] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = alerts.length;
  const seenRaw = useSyncExternalStore(
    subscribeSeenAlerts,
    getSeenAlertsSnapshot,
    getSeenAlertsServerSnapshot,
  );
  const unseen =
    seenRaw !== "__ssr__" &&
    alerts.some((item) => {
      try {
        const seen = JSON.parse(seenRaw) as unknown;
        return !Array.isArray(seen) || !seen.map(String).includes(item.id);
      } catch {
        return true;
      }
    });
  const moving = wiggle && !stopped && unseen;

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border ${
          tone === "light"
            ? "border-[#E2E8F0] bg-white text-[#64748B]"
            : "border-[#253047] bg-[#111827] text-[#94A3B8]"
        } ${moving ? "alert-wiggle" : ""}`}
        aria-label="Avisos"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (alerts.length) {
            markAlertsSeen(alerts.map((item) => item.id));
            setStopped(true);
          }
        }}
      >
        <BellIcon className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-[#EF4444] px-1 text-[9px] font-semibold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#253047] bg-[#111827] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="border-b border-[#253047] px-3 py-2.5 text-xs font-semibold tracking-wide text-[#94A3B8] uppercase">
            Avisos
          </p>
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#94A3B8]">{empty}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {alerts.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 hover:bg-[#172033]"
                >
                  <p className="text-sm font-medium text-[#F8FAFC]">{item.title}</p>
                  {item.subtitle ? <p className="text-xs text-[#94A3B8]">{item.subtitle}</p> : null}
                </Link>
              ))}
            </div>
          )}
          <Link
            href={footerHref}
            onClick={() => setOpen(false)}
            className="block border-t border-[#253047] px-3 py-2.5 text-center text-sm text-[#38BDF8]"
          >
            {footerLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function SellerBell({ alerts, tone = "dark" }: { alerts: SellerBellAlert[]; tone?: "dark" | "light" }) {
  return (
    <AlertsBell
      alerts={alerts.map((item) => ({
        id: item.id,
        href: `/panel/pedidos/${item.id}`,
        title: item.code,
        subtitle: `${item.customerName || "Cliente"} · ${orderStatusLabel[item.status]}`,
      }))}
      footerHref="/panel/pedidos"
      footerLabel="Ver pedidos"
      empty="No hay avisos pendientes."
      tone={tone}
    />
  );
}
