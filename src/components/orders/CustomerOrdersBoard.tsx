"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CreditCardIcon,
  HistoryIcon,
  KeyIcon,
  UsersIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { formatCurrency } from "@/lib/format";
import { resolvePlatformLogoKey, type PlatformLogoKey } from "@/lib/platform-logos";
import type { OrderStatus, Platform } from "@/lib/types";

const PLATFORM_ACCENT: Partial<Record<PlatformLogoKey, string>> = {
  max: "#A855F7",
  netflix: "#E50914",
  "disney-premium": "#2563EB",
  "disney-estandar": "#2563EB",
  prime: "#38BDF8",
  crunchyroll: "#F97316",
};

function platformAccent(platform: Platform | string) {
  const key = resolvePlatformLogoKey(platform);
  if (key && PLATFORM_ACCENT[key]) return PLATFORM_ACCENT[key];
  if (typeof platform !== "string" && platform.accentTo) return platform.accentTo;
  return "#7C3AED";
}

function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((char) => `${char}${char}`).join("") : raw;
  const value = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(value)) return hex;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type CustomerOrderCardData = {
  id: string;
  code: string;
  status: OrderStatus;
  amount: number;
  createdAt: string;
  deliveredAt: string | null;
  purchaseLabel: string;
  deliveredLabel: string | null;
  platform: Platform | string;
  platformName: string;
  planLabel: string;
  profileLabel: string | null;
};

type VisualStatus = "entregado" | "proceso" | "pendiente" | "cancelado";

const filters = [
  { value: "todos", label: "Todos los pedidos" },
  { value: "entregado", label: "Entregados" },
  { value: "proceso", label: "En proceso" },
  { value: "pendiente", label: "Pendiente de pago" },
  { value: "cancelado", label: "Cancelados" },
] as const;

function visualStatus(status: OrderStatus): VisualStatus {
  if (status === "entregado") return "entregado";
  if (status === "cancelado") return "cancelado";
  if (status === "pendiente_pago") return "pendiente";
  return "proceso";
}

const badge = {
  entregado: {
    label: "Entregado",
    className: "bg-[#16A34A] text-white",
    Icon: CheckIcon,
  },
  proceso: {
    label: "En proceso",
    className: "bg-[#2563EB] text-white",
    Icon: HistoryIcon,
  },
  pendiente: {
    label: "Pendiente de pago",
    className: "bg-[#CA8A04] text-white",
    Icon: AlertIcon,
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-[#B91C1C] text-white",
    Icon: CloseIcon,
  },
} as const;

export function CustomerOrdersBoard({
  orders,
}: {
  orders: CustomerOrderCardData[];
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("todos");
  const visible = useMemo(
    () => (filter === "todos" ? orders : orders.filter((item) => visualStatus(item.status) === filter)),
    [filter, orders],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mis pedidos"
        description="Aquí puedes ver el estado de tus compras y acceder a tus servicios."
        action={
          <label className="relative block">
            <span className="sr-only">Filtrar pedidos</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as (typeof filters)[number]["value"])}
              className="appearance-none rounded-xl border border-[#253047] bg-[#111827] py-2.5 pl-3 pr-10 text-sm text-[#F8FAFC]"
            >
              {filters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          </label>
        }
      />
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-10 text-center text-sm text-[#94A3B8]">
          Aún no hay pedidos en esta cuenta. Si compraste en la tienda con otro número, pide a tu vendedor que te cree
          el acceso con el mismo WhatsApp.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrderCardData }) {
  const group = visualStatus(order.status);
  const tone = badge[group];
  const BadgeIcon = tone.Icon;
  const accent = platformAccent(order.platform);

  return (
    <article
      className="overflow-hidden rounded-2xl bg-[#111827] shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      style={{
        border: `1px solid ${withAlpha(accent, 0.42)}`,
        backgroundImage: `linear-gradient(90deg, ${withAlpha(accent, 0.22)} 0%, ${withAlpha(accent, 0.07)} 38%, rgba(17, 24, 39, 0.97) 100%)`,
      }}
    >
      <div className="flex flex-col lg:flex-row">
        <div className="min-w-0 flex-1 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0B111C] p-1"
                style={{ boxShadow: `0 0 18px ${withAlpha(accent, 0.45)}` }}
              >
                <PlatformLogo platform={order.platform} size={36} className="h-8 w-8" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-white">{order.platformName}</h2>
                <p className="text-sm text-[#94A3B8]">{order.planLabel}</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Pedido: {order.code}</p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${tone.className}`}
            >
              <BadgeIcon className="h-3.5 w-3.5" />
              {tone.label}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
            <Meta
              icon={<HistoryIcon className="h-4 w-4" />}
              label="Fecha de compra"
              value={order.purchaseLabel}
            />
            <Meta
              icon={<CreditCardIcon className="h-4 w-4" />}
              label="Total pagado"
              value={formatCurrency(order.amount)}
            />
            {order.profileLabel ? (
              <Meta
                icon={<UsersIcon className="h-4 w-4" />}
                label="Perfil asignado"
                value={order.profileLabel}
              />
            ) : null}
          </div>
        </div>
        <aside
          className="flex flex-col justify-center border-t px-3 py-2.5 sm:px-4 sm:py-3 lg:w-[17.5rem] lg:shrink-0 lg:border-t-0 lg:border-l"
          style={{
            background: withAlpha(accent, 0.14),
            borderColor: withAlpha(accent, 0.28),
          }}
        >
          <StatusPanel group={group} order={order} accent={accent} />
        </aside>
      </div>
    </article>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-[#64748B]">{icon}</span>
      <span>
        <span className="block text-xs text-[#94A3B8]">{label}</span>
        <span className="font-medium text-[#F8FAFC]">{value}</span>
      </span>
    </div>
  );
}

function StatusPanel({
  group,
  order,
  accent,
}: {
  group: VisualStatus;
  order: CustomerOrderCardData;
  accent: string;
}) {
  if (group === "entregado") {
    return (
      <div className="space-y-2 text-center lg:text-left">
        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A]/15 text-[#22C55E] lg:mx-0">
          <CheckIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-[#22C55E]">¡Tu servicio está listo!</p>
          {order.deliveredLabel ? (
            <p className="mt-0.5 text-xs text-[#94A3B8]">Entregado el {order.deliveredLabel}</p>
          ) : null}
        </div>
        <Link
          href="/cliente/acceso"
          className="inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: accent }}
        >
          <KeyIcon className="h-4 w-4" />
          Ver mi acceso
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (group === "proceso") {
    return (
      <div className="space-y-2 text-center lg:text-left">
        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#1E293B] text-[#94A3B8] lg:mx-0">
          <HistoryIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-white">Estamos preparando tu servicio</p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">Te notificaremos cuando esté listo.</p>
        </div>
      </div>
    );
  }

  if (group === "pendiente") {
    return (
      <div className="space-y-2 text-center lg:text-left">
        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#CA8A04]/15 text-[#EAB308] lg:mx-0">
          <AlertIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-[#EAB308]">Tu pago está pendiente</p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">Completa el pago para que podamos activar tu servicio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-center lg:text-left">
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#B91C1C]/15 text-[#F87171] lg:mx-0">
        <CloseIcon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-semibold text-[#F87171]">Pedido cancelado</p>
        <p className="mt-0.5 text-xs text-[#94A3B8]">El pago no se pudo confirmar.</p>
      </div>
    </div>
  );
}
