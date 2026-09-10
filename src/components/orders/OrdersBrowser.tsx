"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClockIcon,
  EyeIcon,
  FilterIcon,
  PlusIcon,
  SendIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { PlatformLogo, PlatformName } from "@/components/ui/PlatformLogo";
import { SearchBar } from "@/components/ui/SearchBar";
import { whatsappParaMostrar } from "@/lib/clientes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { platformDisplayName } from "@/lib/platform-logos";
import { namedOrder } from "@/lib/selectors";
import { waLink } from "@/lib/whatsapp";
import type { Order, OrderStatus } from "@/lib/types";

const GROUPS = [
  { value: "todos", label: "Todos", statuses: null as OrderStatus[] | null },
  { value: "pendientes", label: "Pendientes", statuses: ["pendiente_pago", "pago_enviado"] as OrderStatus[] },
  { value: "revision", label: "En revisión", statuses: ["pago_enviado"] as OrderStatus[] },
  { value: "pagados", label: "Pagados", statuses: ["pago_aprobado", "preparando"] as OrderStatus[] },
  { value: "entregados", label: "Entregados", statuses: ["entregado"] as OrderStatus[] },
  { value: "rechazados", label: "Rechazados", statuses: ["cancelado"] as OrderStatus[] },
] as const;

const PILL: Record<OrderStatus, { label: string; className: string }> = {
  pendiente_pago: { label: "Pendiente", className: "bg-[#F97316] text-white" },
  pago_enviado: { label: "Pago enviado", className: "bg-[#38BDF8] text-[#0B111C]" },
  pago_aprobado: { label: "Pagado", className: "bg-[#22C55E] text-white" },
  preparando: { label: "En revisión", className: "bg-[#8B5CF6] text-white" },
  entregado: { label: "Entregado", className: "bg-[#16A34A] text-white" },
  cancelado: { label: "Cancelado", className: "bg-[#EF4444] text-white" },
};

const SEARCH_INPUT =
  "h-9 w-full rounded-xl border border-[#253047] bg-[#111827] py-0 pr-3 pl-9 text-[13px] text-[#E2E8F0] outline-none placeholder:text-[#64748B] focus:ring-2 focus:ring-[#8B5CF6]/40 lg:h-10 lg:pl-10 lg:text-sm";

function orderHref(template: string | undefined, id: string) {
  if (!template) return undefined;
  return template.includes("{id}") ? template.replaceAll("{id}", id) : template;
}

function OrderPill({ status }: { status: OrderStatus }) {
  const item = PILL[status];
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${item.className}`}>
      {item.label}
    </span>
  );
}

function primaryFor(status: OrderStatus, compact = false) {
  if (status === "pendiente_pago" || status === "pago_enviado") {
    return { label: compact ? "Confirmar" : "Confirmar pago", icon: ClockIcon, fill: true };
  }
  if (status === "pago_aprobado" || status === "preparando") {
    return { label: compact ? "Enviar" : "Enviar cuenta", icon: SendIcon, fill: false };
  }
  return null;
}

function MobileOrderCard({
  order,
  href,
  showSeller,
}: {
  order: ReturnType<typeof namedOrder>;
  href?: string;
  showSeller?: boolean;
}) {
  const wa = order.whatsapp
    ? waLink(order.whatsapp, `Hola ${order.customerName}, te escribo por tu pedido ${order.code}.`)
    : null;
  const primary = primaryFor(order.status, true);
  const platform = order.platformName || order.platformId;
  const phone = whatsappParaMostrar(order.whatsapp) || "—";
  const body = (
    <>
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 truncate text-[13px] font-semibold leading-none text-white">{order.code}</p>
        <OrderPill status={order.status} />
        <p className="ml-auto shrink-0 text-[13px] font-semibold leading-none text-white">{formatCurrency(order.amount)}</p>
      </div>
      <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] leading-none text-[#94A3B8]">
        <span className="min-w-0 truncate">{order.customerName}</span>
        <span className="shrink-0 text-[#334155]">·</span>
        <span className="shrink-0 tabular-nums">{phone}</span>
        <span className="shrink-0 text-[#334155]">·</span>
        <PlatformLogo platform={platform} size={14} />
        <span className="min-w-0 truncate">{platformDisplayName(platform) || platform}</span>
        <span className="ml-auto shrink-0 text-[10px] text-[#64748B]">{formatDate(order.createdAt)}</span>
      </p>
      {showSeller ? <p className="mt-0.5 truncate text-[10px] leading-none text-[#64748B]">{order.sellerName}</p> : null}
    </>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-[#253047] bg-[#111827]">
      <div className="flex items-stretch">
        {href ? (
          <Link href={href} className="min-w-0 flex-1 px-2.5 py-1.5 active:bg-[#172033]">
            {body}
          </Link>
        ) : (
          <div className="min-w-0 flex-1 px-2.5 py-1.5">{body}</div>
        )}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-8 shrink-0 items-center justify-center text-[#4ADE80]"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      {primary && href ? (
        <div className="px-2 pb-1.5">
          <Link
            href={href}
            className={`inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold ${
              primary.fill
                ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
                : "border border-[#253047] text-[#E2E8F0]"
            }`}
          >
            <primary.icon className="h-3.5 w-3.5" />
            {primary.label}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function OrdersBrowser({
  orders,
  showSeller,
  actionHref,
  createHref,
}: {
  orders: Order[];
  showSeller?: boolean;
  actionHref?: string;
  createHref?: string;
}) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]["value"]>("todos");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const named = useMemo(() => orders.map(namedOrder), [orders]);
  const platforms = useMemo(
    () => [...new Set(named.map((item) => item.platformName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [named],
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = whatsappParaMostrar(query);
    return named.filter((order) => {
      if (platform !== "all" && order.platformName !== platform) return false;
      if (!q) return true;
      const hay = `${order.code} ${order.sellerName} ${order.customerName} ${order.whatsapp} ${order.platformName} ${order.planName}`.toLowerCase();
      const phone = whatsappParaMostrar(order.whatsapp);
      return hay.includes(q) || (qDigits.length > 0 && phone.includes(qDigits));
    });
  }, [named, platform, query]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const item of GROUPS) {
      next[item.value] = item.statuses
        ? searched.filter((order) => item.statuses!.includes(order.status)).length
        : searched.length;
    }
    return next;
  }, [searched]);

  const filtered = useMemo(() => {
    const current = GROUPS.find((item) => item.value === group);
    if (!current?.statuses) return searched;
    return searched.filter((order) => current.statuses!.includes(order.status));
  }, [group, searched]);

  return (
    <div className="flex flex-col gap-2 lg:h-[calc(100dvh-9.25rem)] lg:min-h-0 lg:gap-3 lg:overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-white lg:text-2xl">Pedidos</h1>
          <p className="mt-0.5 hidden text-sm text-[#94A3B8] lg:block">Estado, historial y detalle de cada pedido.</p>
        </div>
        {createHref ? (
          <Link
            href={createHref}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white sm:h-10 sm:w-auto sm:gap-1 sm:px-4 sm:text-sm sm:font-semibold"
            aria-label="Nuevo pedido"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo pedido</span>
          </Link>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((item) => {
          const active = group === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setGroup(item.value)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium lg:gap-1.5 lg:px-3 lg:py-1.5 lg:text-xs ${
                active ? "bg-[#7C3AED] text-white" : "border border-[#253047] bg-[#111827] text-[#94A3B8]"
              }`}
            >
              {item.label}
              <span
                className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-[#172033] text-[#CBD5E1]"
                }`}
              >
                {counts[item.value] ?? 0}
              </span>
            </button>
          );
        })}
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:w-[22rem]">
          <SearchBar
            className="min-w-0 flex-1"
            inputClassName={SEARCH_INPUT}
            value={query}
            onChange={setQuery}
            placeholder="Buscar pedido, cliente o plataforma..."
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border lg:h-10 lg:w-10 ${
              platform === "all" ? "border-[#253047] bg-[#111827] text-[#94A3B8]" : "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#C4B5FD]"
            }`}
            aria-label="Filtros"
          >
            <FilterIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto lg:hidden">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-10 text-center text-sm text-[#94A3B8]">
            No hay pedidos para mostrar.
          </p>
        ) : (
          filtered.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              href={orderHref(actionHref, order.id)}
              showSeller={showSeller}
            />
          ))
        )}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto rounded-2xl border border-[#253047] bg-[#0B111C] lg:block">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-[#111827] text-[10px] font-medium tracking-[0.12em] text-[#94A3B8] uppercase">
            <tr>
              <th className="px-3 py-2.5">Pedido</th>
              {showSeller ? <th className="px-3 py-2.5">Vendedor</th> : null}
              <th className="px-3 py-2.5">Cliente</th>
              <th className="px-3 py-2.5">Plataforma</th>
              <th className="px-3 py-2.5 text-right">Monto</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showSeller ? 7 : 6} className="px-3 py-16 text-center text-sm text-[#94A3B8]">
                  No hay pedidos para mostrar.
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const href = orderHref(actionHref, order.id);
                const wa = order.whatsapp
                  ? waLink(order.whatsapp, `Hola ${order.customerName}, te escribo por tu pedido ${order.code}.`)
                  : null;
                const primary = primaryFor(order.status);
                return (
                  <tr key={order.id} className="border-t border-[#1E293B] hover:bg-[#111827]/80">
                    <td className="px-3 py-2">
                      <p className="font-semibold whitespace-nowrap text-white">{order.code}</p>
                      <p className="text-[11px] text-[#94A3B8]">{formatDateTime(order.createdAt)}</p>
                    </td>
                    {showSeller ? <td className="px-3 py-2 whitespace-nowrap text-[#CBD5E1]">{order.sellerName}</td> : null}
                    <td className="px-3 py-2">
                      <p className="truncate font-medium text-[#F8FAFC]">{order.customerName}</p>
                      <p className="text-[11px] text-[#94A3B8]">{whatsappParaMostrar(order.whatsapp) || "—"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <PlatformName platform={order.platformName || order.platformId} size="table" className="text-[#F8FAFC]" />
                      {order.planName && order.planName !== order.platformName ? (
                        <p className="mt-0.5 truncate text-[11px] text-[#94A3B8]">{order.planName}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-white">{formatCurrency(order.amount)}</td>
                    <td className="px-3 py-2">
                      <OrderPill status={order.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[#E2E8F0] hover:bg-[#172033]"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                            Ver
                          </Link>
                        ) : null}
                        {wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#4ADE80] hover:bg-[#172033]"
                            aria-label="WhatsApp"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </a>
                        ) : null}
                        {primary && href ? (
                          <Link
                            href={href}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold ${
                              primary.fill
                                ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
                                : "border border-[#253047] text-[#E2E8F0] hover:bg-[#172033]"
                            }`}
                          >
                            <primary.icon className="h-3.5 w-3.5" />
                            {primary.label}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={filtersOpen} title="Filtros" onClose={() => setFiltersOpen(false)}>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-[#94A3B8]">Plataforma</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#253047] bg-[#0B111C] px-3 text-sm text-[#F8FAFC]"
            >
              <option value="all">Todas</option>
              {platforms.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="h-10 flex-1 rounded-xl border border-[#253047] text-sm text-[#E2E8F0]"
              onClick={() => {
                setPlatform("all");
                setFiltersOpen(false);
              }}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="h-10 flex-1 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-sm font-semibold text-white"
              onClick={() => setFiltersOpen(false)}
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
