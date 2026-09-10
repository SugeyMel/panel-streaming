"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerSquareLogo } from "@/components/cliente/CustomerSquareLogo";
import {
  ArrowRightIcon,
  CalendarIcon,
  EyeIcon,
  InfoIcon,
  PlusIcon,
  RefreshIcon,
  ShoppingBagIcon,
} from "@/components/icons";
import { daysRemaining, formatDate, serviceStatusFromDates } from "@/lib/format";
import { parseProfileSlot } from "@/lib/inventory-matrix";
import { colorWithAlpha, platformCardTheme, platformDisplayName } from "@/lib/platform-logos";
import type { Platform, Product, Subscription, SubscriptionStatus } from "@/lib/types";

type FilterId = "todos" | "activos" | "por_vencer" | "vencidos" | "cancelados";

const FILTERS: { id: FilterId; label: string; dot: string | null }[] = [
  { id: "todos", label: "Todos", dot: null },
  { id: "activos", label: "Activos", dot: "bg-[#22C55E]" },
  { id: "por_vencer", label: "Por vencer", dot: "bg-[#F59E0B]" },
  { id: "vencidos", label: "Vencidos", dot: "bg-[#EF4444]" },
  { id: "cancelados", label: "Cancelados", dot: "bg-[#64748B]" },
];

function bucket(status: SubscriptionStatus, renewalIntent?: Subscription["renewalIntent"]): Exclude<FilterId, "todos"> {
  if (renewalIntent === "decline" || status === "cancelado" || status === "suspendido") return "cancelados";
  if (status === "vencido") return "vencidos";
  if (status === "proximo_a_vencer") return "por_vencer";
  return "activos";
}

function spanDays(startDate: string, endDate: string, durationMonths: number, durationDays?: number) {
  if (durationDays && durationDays > 0) return durationDays;
  if (durationMonths > 0) return durationMonths * 30;
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 100;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

function planLabel(subscription: Subscription, product: Product | undefined) {
  const parsed = parseProfileSlot(subscription.accessProfile);
  if (parsed.slot > 0) return `Perfil ${parsed.slot}`;
  const name = product?.name?.trim();
  if (name) return name;
  if (product?.durationDays) return `${product.durationDays} días`;
  if (subscription.durationMonths) {
    return `${subscription.durationMonths} mes${subscription.durationMonths === 1 ? "" : "es"}`;
  }
  if (parsed.name) return parsed.name;
  return "Plan activo";
}

function tileStyle(platform: Platform | undefined, platformId: string) {
  const theme = platformCardTheme(platform ?? platformId);
  return {
    background: `radial-gradient(circle at 10% 12%, ${colorWithAlpha(theme.to, 0.2)} 0%, transparent 46%), linear-gradient(180deg, #121A2C 0%, #0C1322 100%)`,
    borderColor: "rgba(37, 48, 71, 0.95)",
  };
}

export function CustomerServicesBoard({
  services,
  platforms,
  products,
}: {
  services: Subscription[];
  platforms: Platform[];
  products: Product[];
}) {
  const [filter, setFilter] = useState<FilterId>("todos");

  const rows = useMemo(
    () =>
      services.map((subscription) => {
        const platform = platforms.find((item) => item.id === subscription.platformId);
        const product = products.find((item) => item.id === subscription.productId);
        const status = serviceStatusFromDates(subscription.endDate, subscription.status);
        return {
          subscription,
          platform,
          product,
          status,
          group: bucket(status, subscription.renewalIntent),
        };
      }),
    [services, platforms, products],
  );

  const counts = useMemo(() => {
    const next = { todos: rows.length, activos: 0, por_vencer: 0, vencidos: 0, cancelados: 0 };
    for (const row of rows) next[row.group] += 1;
    return next;
  }, [rows]);

  const visible = filter === "todos" ? rows : rows.filter((row) => row.group === filter);
  const shopLogos = platforms.filter((item) => item.available).slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem]">
            Mis servicios
          </h1>
          <p className="mt-1 truncate text-[12px] leading-snug text-[#94A3B8] sm:max-w-2xl sm:whitespace-normal sm:text-[13px]">
            Gestiona tus plataformas, revisa tus fechas de vencimiento y renueva cuando lo necesites.
          </p>
        </div>
        <Link
          href="/cliente/comprar"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-2.5 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] sm:h-10 sm:rounded-2xl sm:px-3.5 sm:text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Comprar más
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium sm:h-9 sm:px-3 ${
                active
                  ? "bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white"
                  : "border border-[#253047] bg-[#111827] text-[#CBD5E1]"
              }`}
            >
              {item.dot ? <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} /> : null}
              {item.label}
              <span
                className={`min-w-4 rounded-full px-1.5 text-center text-[10px] font-semibold ${
                  active ? "bg-black/20 text-white" : "bg-white/10 text-[#94A3B8]"
                }`}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-6 text-center text-sm text-[#94A3B8]">
          No hay servicios en este filtro.
        </p>
      ) : (
        <div className="@container min-w-0">
          <div className="grid gap-2.5 @[560px]:grid-cols-2">
          {visible.map((row) => (
            <ServiceTile
              key={row.subscription.id}
              subscription={row.subscription}
              platform={row.platform}
              product={row.product}
              status={row.status}
            />
          ))}
          </div>
        </div>
      )}

      <Link
        href="/cliente/comprar"
        className="flex items-center gap-2.5 overflow-hidden rounded-2xl border border-[#7C3AED]/40 bg-[linear-gradient(90deg,#2E1064_0%,#1E1B4B_42%,#0B1220_100%)] px-3 py-2.5 sm:gap-3 sm:px-4"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7C3AED]/35 text-white">
          <ShoppingBagIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-white sm:text-sm">¿Quieres más entretenimiento?</span>
          <span className="mt-0.5 block truncate text-[11px] text-[#C4B5FD]">
            Explora todas nuestras plataformas disponibles y encuentra la opción ideal para ti.
          </span>
        </span>
        <span className="hidden items-center -space-x-1 sm:flex">
          {shopLogos.map((platform) => (
            <span key={platform.id} className="rounded-[8px] ring-2 ring-[#1E1B4B]">
              <CustomerSquareLogo platform={platform} title={platform.name} size={28} />
            </span>
          ))}
        </span>
        <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-2.5 text-[11px] font-semibold text-white sm:h-9 sm:px-3 sm:text-xs">
          Ir a la tienda
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}

function ServiceTile({
  subscription,
  platform,
  product,
  status,
}: {
  subscription: Subscription;
  platform?: Platform;
  product?: Product;
  status: SubscriptionStatus;
}) {
  const days = daysRemaining(subscription.endDate);
  const closed =
    subscription.renewalIntent === "decline" || status === "cancelado" || status === "suspendido";
  const expired = !closed && (days < 0 || status === "vencido");
  const soon = !closed && !expired && days <= 30;
  const total = spanDays(
    subscription.startDate,
    subscription.endDate,
    subscription.durationMonths,
    product?.durationDays,
  );
  const pct =
    closed || expired
      ? 0
      : Math.min(100, Math.max(8, Math.round((Math.max(days, 0) / Math.max(total, 100)) * 100)));
  const bar = expired || closed ? "#334155" : soon ? "#F59E0B" : "#22C55E";
  const dayClass = expired || closed ? "text-[#F87171]" : soon ? "text-[#FBBF24]" : "text-[#4ADE80]";
  const title =
    platformDisplayName(platform ?? subscription.platformId) || platform?.name?.trim() || "Servicio";
  const renewHref = `/cliente/renovar/${subscription.id}`;
  const detailHref = `/cliente/servicios/${subscription.id}`;
  const renewing = subscription.renewalIntent === "renew";
  const badge = closed ? "Cancelado" : expired ? "Vencido" : status === "proximo_a_vencer" ? "Por vencer" : "Activo";

  return (
    <article className="overflow-hidden rounded-2xl border p-3" style={tileStyle(platform, subscription.platformId)}>
      <div className="flex items-start gap-2.5">
        <CustomerSquareLogo platform={platform ?? subscription.platformId} title={title} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold leading-tight text-white">{title}</h2>
              <p className="mt-0.5 truncate text-[11px] text-white/55">Plan: {planLabel(subscription, product)}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                closed
                  ? "bg-[#B91C1C] text-white"
                  : expired
                    ? "bg-[#DC2626] text-white"
                    : status === "proximo_a_vencer"
                      ? "bg-[#FBBF24] text-[#1C1917]"
                      : "bg-[#16A34A] text-white"
              }`}
            >
              {badge}
            </span>
          </div>

          <div className="mt-2 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 text-[11px] text-white/70">
                <CalendarIcon className="h-3.5 w-3.5 text-white/40" />
                Vence: {formatDate(subscription.endDate)}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bar }} />
              </div>
            </div>
            <div className={`min-w-[4.5rem] shrink-0 pb-px text-right leading-none ${dayClass}`} suppressHydrationWarning>
              <p className="text-[10px] font-medium opacity-80">{expired || closed ? "Vencido hace" : "Faltan"}</p>
              <p className="mt-1 text-[16px] font-bold tracking-tight whitespace-nowrap sm:text-[17px]">
                {expired || closed
                  ? `${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`
                  : days === 0
                    ? "Hoy"
                    : `${days} día${days === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {closed ? (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-start gap-1.5 rounded-xl border border-[#38BDF8]/25 bg-black/25 px-2.5 py-1.5 text-[11px] leading-snug text-[#94A3B8]">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
            Se procede con la finalización de tu servicio.
          </p>
          <Link
            href={detailHref}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-black/25 px-2.5 text-[11px] font-medium text-[#E2E8F0]"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            Ver detalles
          </Link>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={detailHref}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-white/15 bg-black/25 px-2 text-[11px] font-medium whitespace-nowrap text-[#E2E8F0] sm:h-9 sm:gap-1.5"
          >
            <EyeIcon className="h-3.5 w-3.5 shrink-0" />
            Ver detalles
          </Link>
          <Link
            href={renewHref}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-[#22C55E] px-2 text-[11px] font-semibold whitespace-nowrap text-white sm:h-9 sm:gap-1.5"
          >
            <RefreshIcon className="h-3.5 w-3.5 shrink-0" />
            {renewing ? "Comprobante" : "Renovar ahora"}
          </Link>
        </div>
      )}
    </article>
  );
}
