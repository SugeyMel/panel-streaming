"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { inSelectedMonth, type AdminHomePayload } from "@/lib/admin-home";

const RENTAL = { key: "rental", label: "Alquiler de panel", color: "#8B5CF6" } as const;
const WHOLESALE = { key: "platforms", label: "Plataformas al mayoreo", color: "#F59E0B" } as const;

const METHOD_COLORS = {
  yape: "#F472B6",
  plin: "#38BDF8",
  bank: "#FBBF24",
  other: "#64748B",
} as const;

type EvolutionRange = "30d" | "month" | "90d";

export function AdminHomeDashboard({ data }: { data: AdminHomePayload }) {
  const [month, setMonth] = useState(data.defaultMonth);
  const [evolution, setEvolution] = useState<EvolutionRange>("30d");

  const sellersThisMonth = data.sellers.filter((item) => inSelectedMonth(item.registeredAt, month)).length;
  const customersThisMonth = data.customers.filter((item) => inSelectedMonth(item.registeredAt, month)).length;
  const sellersActive = data.sellers.filter((item) => item.status === "activo").length;
  const sellersOther = Math.max(0, data.sellers.length - sellersActive);
  const customersActive = data.customers.filter((item) => item.status === "activo").length;
  const customersInactive = data.customers.length - customersActive;

  const rental = 0;
  const platforms = 0;
  const totalIncome = rental + platforms;
  const rentalHealthReady = false;
  const payments: { seller: string; amount: number; date: string; method: "yape" | "plin" | "bank" | "other" }[] = [];
  const methods = { yape: 0, plin: 0, bank: 0, other: 0 };

  const bars = [
    { ...RENTAL, amount: rental },
    { ...WHOLESALE, amount: platforms },
  ];

  return (
    <div className="space-y-2 lg:space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[1.15rem] font-bold tracking-tight text-white lg:text-[1.45rem]">
            ¡Hola, {data.greetingName}!
          </h1>
          <p className="text-[11px] leading-snug text-[#94A3B8] lg:text-sm">
            Aquí tienes un resumen general de tu negocio.
          </p>
        </div>
        <label className="relative w-[9.75rem] shrink-0 lg:w-auto">
          <span className="sr-only">Período</span>
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#94A3B8]">
            <CalendarIcon />
          </span>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-8 w-full appearance-none rounded-lg border border-[#253047] bg-[#111827] py-0 pr-7 pl-8 text-[11px] text-[#F1F5F9] outline-none lg:h-9 lg:min-w-[13rem] lg:rounded-xl lg:pr-9 lg:pl-10 lg:text-sm"
          >
            {data.months.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label="Vendedores"
          value={String(data.sellers.length)}
          hint={`↑ +${sellersThisMonth} este mes`}
          icon={<UserGlyph />}
          iconClass="bg-[#1D4ED8]/50 text-[#93C5FD]"
          cardClass="bg-[#172554]/80"
        />
        <KpiCard
          label="Clientes"
          value={String(data.customers.length)}
          hint={`↑ +${customersThisMonth} este mes`}
          icon={<UsersGlyph />}
          iconClass="bg-[#15803D]/50 text-[#86EFAC]"
          cardClass="bg-[#052e16]/80"
        />
        <KpiCard
          label="Alquiler de panel"
          value={formatCurrency(rental)}
          hint="↑ +0% este mes"
          icon={<CrownGlyph />}
          iconClass="bg-[#6D28D9]/50 text-[#DDD6FE]"
          cardClass="bg-[#2e1065]/80"
        />
        <KpiCard
          label="Plataformas al mayoreo"
          value={formatCurrency(platforms)}
          hint="↑ +0% este mes"
          icon={<ChartGlyph />}
          iconClass="bg-[#9F1239]/50 text-[#FDA4AF]"
          cardClass="bg-[#4c0519]/80"
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)] lg:gap-2.5">
        <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white lg:text-base">Ingresos por categoría</h2>
            <span className="rounded-lg border border-[#253047] bg-[#0B0F1A] px-2.5 py-1 text-xs text-[#94A3B8]">
              Este mes
            </span>
          </div>
          <CategoryBars items={bars} />
        </section>

        <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
          <p className="text-xs font-medium text-[#94A3B8] lg:text-sm">Ingresos totales</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold tracking-tight text-white lg:text-3xl">{formatCurrency(totalIncome)}</p>
            <span className="rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#4ADE80]">
              +0%
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">en comparación al mes anterior</p>
          <ul className="mt-2 space-y-1.5 lg:mt-3 lg:space-y-2.5">
            {bars.map((item) => {
              const pct = totalIncome > 0 ? Math.round((item.amount / totalIncome) * 100) : 0;
              return (
                <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5 text-[#CBD5E1]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold text-white">{formatCurrency(item.amount)}</span>
                    <span className="ml-3 text-[#64748B]">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2 lg:mb-2">
          <h2 className="text-sm font-semibold text-white lg:text-base">Evolución de ingresos</h2>
          <label className="relative shrink-0">
            <span className="sr-only">Rango de evolución</span>
            <select
              value={evolution}
              onChange={(event) => setEvolution(event.target.value as EvolutionRange)}
              className="h-7 appearance-none rounded-lg border border-[#253047] bg-[#0B0F1A] py-0 pr-7 pl-2 text-[10px] text-[#E2E8F0] outline-none lg:h-9 lg:pr-8 lg:pl-3 lg:text-xs"
            >
              <option value="30d">Últimos 30 días</option>
              <option value="month">Este mes</option>
              <option value="90d">Últimos 3 meses</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          </label>
        </div>
        <div className="mb-1 flex justify-center gap-3 lg:hidden">
          <LegendDot color={RENTAL.color} label={RENTAL.label} />
          <LegendDot color={WHOLESALE.color} label={WHOLESALE.label} />
        </div>
        <div className="mb-2 hidden flex-wrap items-center gap-4 lg:flex">
          <LegendDot color={RENTAL.color} label={RENTAL.label} />
          <LegendDot color={WHOLESALE.color} label={WHOLESALE.label} />
        </div>
        <EvolutionChart rental={rental} platforms={platforms} />
      </section>

      <div className="grid grid-cols-2 gap-2 lg:gap-2.5">
        <Link
          href="/admin/vendedores"
          className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 transition hover:border-[#3B4A66] lg:rounded-2xl lg:p-4"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#1D4ED8]/30 text-[#93C5FD]">
              <UserGlyph />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white lg:text-sm">
                Vendedores <span className="text-base font-bold">{data.sellers.length}</span>
              </p>
              <p className="truncate text-[10px] lg:text-xs">
                <span className="text-[#22C55E]">Activos: {sellersActive}</span>
                <span className="text-[#64748B]"> · </span>
                <span className="text-[#F59E0B]">Por vencer: {rentalHealthReady ? 0 : "—"}</span>
                <span className="text-[#64748B]"> · </span>
                <span className="text-[#EF4444]">Vencidos: {rentalHealthReady ? 0 : "—"}</span>
              </p>
            </div>
          </div>
          <ProportionBar
            className="mt-2 h-1.5 lg:h-2.5"
            segments={[
              { value: sellersActive, color: "#22C55E" },
              { value: rentalHealthReady ? 0 : 0, color: "#F59E0B" },
              { value: rentalHealthReady ? 0 : sellersOther, color: rentalHealthReady ? "#EF4444" : "#334155" },
            ]}
          />
        </Link>

        <Link
          href="/admin/clientes"
          className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 transition hover:border-[#3B4A66] lg:rounded-2xl lg:p-4"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#15803D]/30 text-[#86EFAC]">
              <UsersGlyph />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white lg:text-sm">
                Clientes <span className="text-base font-bold">{data.customers.length}</span>
              </p>
              <p className="truncate text-[10px] lg:text-xs">
                <span className="text-[#7DD3FC]">Activos: {customersActive}</span>
                <span className="text-[#64748B]"> · </span>
                <span className="text-[#94A3B8]">Inactivos: {customersInactive}</span>
              </p>
            </div>
          </div>
          <ProportionBar
            className="mt-2 h-1.5 lg:h-2.5"
            segments={[
              { value: customersActive, color: "#38BDF8" },
              { value: customersInactive, color: "#1E3A5F" },
            ]}
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:gap-2.5">
        <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
          <h2 className="text-[11px] font-semibold text-white lg:text-base">Métodos de pago más usados</h2>
          <div className="mt-2 flex flex-col items-center gap-2 lg:mt-3 lg:flex-row lg:gap-4">
            <Donut
              total={totalIncome}
              slices={[
                { value: methods.yape, color: METHOD_COLORS.yape },
                { value: methods.plin, color: METHOD_COLORS.plin },
                { value: methods.bank, color: METHOD_COLORS.bank },
                { value: methods.other, color: METHOD_COLORS.other },
              ]}
            />
            <ul className="w-full min-w-0 space-y-1 text-[10px] lg:flex-1 lg:space-y-3 lg:text-sm">
              <MethodRow label="Yape" color={METHOD_COLORS.yape} value={methods.yape} total={totalIncome} />
              <MethodRow label="Plin" color={METHOD_COLORS.plin} value={methods.plin} total={totalIncome} />
              <MethodRow label="Transferencia" color={METHOD_COLORS.bank} value={methods.bank} total={totalIncome} />
              <MethodRow label="Otros" color={METHOD_COLORS.other} value={methods.other} total={totalIncome} />
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <h2 className="text-[11px] font-semibold text-white lg:text-base">Últimos cobros</h2>
            <Link href="/admin/vendedores" className="text-[10px] font-medium text-[#A78BFA] lg:text-xs">
              Ver todos
            </Link>
          </div>
          <p className="py-3 text-center text-[10px] leading-snug text-[#64748B] lg:hidden">
            Todavía no hay cobros de alquiler del panel.
          </p>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs text-[#64748B]">
                <tr>
                  <th className="pb-3 font-medium">Vendedor</th>
                  <th className="pb-3 font-medium">Monto</th>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Método</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-[#64748B]">
                      Todavía no hay cobros de alquiler del panel.
                    </td>
                  </tr>
                ) : (
                  payments.map((item, index) => (
                    <tr key={`${item.seller}-${index}`} className="border-t border-[#253047]">
                      <td className="py-3">
                        <span className="inline-flex items-center gap-2.5 font-medium text-white">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1E293B] text-xs">
                            {item.seller.slice(0, 1).toUpperCase()}
                          </span>
                          {item.seller}
                        </span>
                      </td>
                      <td className="py-3 text-[#E2E8F0]">{formatCurrency(item.amount)}</td>
                      <td className="py-3 text-[#94A3B8]">{item.date}</td>
                      <td className="py-3">
                        <MethodBadge method={item.method} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  iconClass,
  cardClass = "bg-[#111827]",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  iconClass: string;
  cardClass?: string;
}) {
  return (
    <article className={`flex items-center gap-2.5 rounded-xl border border-[#253047] px-2.5 py-2 lg:gap-4 lg:rounded-2xl lg:px-4 lg:py-3.5 ${cardClass}`}>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg lg:h-12 lg:w-12 lg:rounded-xl ${iconClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg leading-none font-bold tracking-tight text-white lg:text-[1.75rem]">{value}</p>
        <p className="mt-1 truncate text-[11px] text-[#E2E8F0] lg:mt-1.5 lg:text-sm">{label}</p>
        <p className="mt-0.5 text-[10px] font-medium text-[#4ADE80] lg:mt-1 lg:text-sm">{hint}</p>
      </div>
    </article>
  );
}

function CategoryBars({ items }: { items: { key: string; label: string; color: string; amount: number }[] }) {
  const maxValue = Math.max(1200, ...items.map((item) => item.amount));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(maxValue * part));
  return (
    <div className="flex h-[8.5rem] gap-2 lg:h-[10.5rem] lg:gap-3">
      <div className="flex h-[calc(100%-2.25rem)] flex-col justify-between pb-1 text-[11px] text-[#64748B]">
        {[...ticks].reverse().map((tick) => (
          <span key={tick}>{tick.toLocaleString("es-PE")}</span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 h-[calc(100%-2.25rem)]">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute right-0 left-0 border-t border-[#1E293B]"
              style={{ bottom: `${(tick / maxValue) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative flex h-[calc(100%-1.75rem)] items-end justify-around gap-3 px-2 lg:h-[calc(100%-2.25rem)] lg:gap-8 lg:px-6">
          {items.map((item) => {
            const height = Math.max(item.amount > 0 ? 8 : 4, (item.amount / maxValue) * 100);
            return (
              <div key={item.key} className="flex h-full w-24 flex-col items-center justify-end">
                <p className="mb-2 text-xs font-semibold text-white">{formatCurrency(item.amount)}</p>
                <div
                  className="w-16 rounded-t-2xl lg:w-[4.75rem]"
                  style={{
                    height: `${height}%`,
                    background:
                      item.key === "platforms"
                        ? "linear-gradient(180deg, #FBBF24 0%, #F97316 100%)"
                        : "linear-gradient(180deg, #A78BFA 0%, #7C3AED 100%)",
                    opacity: item.amount > 0 ? 1 : 0.35,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-around gap-3 px-2 text-center text-[10px] text-[#94A3B8] lg:mt-2 lg:gap-8 lg:px-6 lg:text-xs">
          {items.map((item) => (
            <span key={item.key} className="w-24 lg:w-[4.75rem]">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvolutionChart({ rental, platforms }: { rental: number; platforms: number }) {
  const rentalId = useId().replace(/:/g, "");
  const wholesaleId = useId().replace(/:/g, "");
  const width = 920;
  const height = 240;
  const pad = { top: 8, right: 8, bottom: 8, left: 8 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const days = 30;
  const maxY = Math.max(400, rental, platforms);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const rentalPts = Array.from({ length: days }, (_, index) => {
    const x = pad.left + (index / (days - 1)) * plotW;
    const y = pad.top + plotH - ((rental > 0 ? rental : 0) / maxY) * plotH;
    return { x, y };
  });
  const wholesalePts = Array.from({ length: days }, (_, index) => {
    const x = pad.left + (index / (days - 1)) * plotW;
    const y = pad.top + plotH - ((platforms > 0 ? platforms : 0) / maxY) * plotH;
    return { x, y };
  });
  const empty = rental === 0 && platforms === 0;

  return (
    <div className="relative flex h-24 gap-2 lg:h-36">
      <div className="flex w-8 shrink-0 flex-col justify-between py-1 text-right text-[11px] leading-none text-[#94A3B8]">
        {[...ticks].reverse().map((part) => (
          <span key={part}>{Math.round(maxY * part)}</span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
          {ticks.map((part) => {
            const y = pad.top + plotH * (1 - part);
            return (
              <line
                key={part}
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="#1E293B"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <path
            d={`${curvePath(rentalPts)} L ${rentalPts[rentalPts.length - 1].x} ${pad.top + plotH} L ${rentalPts[0].x} ${pad.top + plotH} Z`}
            fill={`url(#${rentalId})`}
            opacity={empty ? 0.12 : 0.28}
          />
          <path
            d={`${curvePath(wholesalePts)} L ${wholesalePts[wholesalePts.length - 1].x} ${pad.top + plotH} L ${wholesalePts[0].x} ${pad.top + plotH} Z`}
            fill={`url(#${wholesaleId})`}
            opacity={empty ? 0.12 : 0.28}
          />
          <path
            d={curvePath(rentalPts)}
            fill="none"
            stroke={RENTAL.color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={curvePath(wholesalePts)}
            fill="none"
            stroke={WHOLESALE.color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <linearGradient id={rentalId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RENTAL.color} />
              <stop offset="100%" stopColor={RENTAL.color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={wholesaleId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={WHOLESALE.color} />
              <stop offset="100%" stopColor={WHOLESALE.color} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {empty ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-sm text-[#64748B]">
            Sin cobros de alquiler ni ventas de plataformas al mayoreo en este período.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function curvePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

function ProportionBar({
  segments,
  className = "mt-4 h-2",
}: {
  segments: { value: number; color: string }[];
  className?: string;
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className={`flex overflow-hidden rounded-full bg-[#0B0F1A] ${className}`}>
      {total === 0 ? (
        <span className="h-full w-full bg-[#1E293B]" />
      ) : (
        segments.map((item, index) =>
          item.value <= 0 ? null : (
            <span
              key={`${item.color}-${index}`}
              className="h-full"
              style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
            />
          ),
        )
      )}
    </div>
  );
}

function MethodRow({
  label,
  color,
  value,
  total,
}: {
  label: string;
  color: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-[#CBD5E1]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold text-white">{pct}%</span>
    </li>
  );
}

function MethodBadge({ method }: { method: "yape" | "plin" | "bank" | "other" }) {
  const styles = {
    yape: "bg-[#F472B6]/20 text-[#F9A8D4]",
    plin: "bg-[#38BDF8]/20 text-[#7DD3FC]",
    bank: "bg-[#FBBF24]/20 text-[#FDE68A]",
    other: "bg-[#64748B]/20 text-[#94A3B8]",
  };
  const labels = { yape: "Yape", plin: "Plin", bank: "Transferencia", other: "Otros" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[method]}`}>
      {labels[method]}
    </span>
  );
}

function Donut({
  total,
  slices,
}: {
  total: number;
  slices: { value: number; color: string }[];
}) {
  const radius = 48;
  const stroke = 14;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 lg:h-40 lg:w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1E293B" strokeWidth={stroke} />
        {total > 0
          ? slices.map((slice, index) => {
              const length = (slice.value / total) * circ;
              const circle = (
                <circle
                  key={`${slice.color}-${index}`}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${length} ${circ - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })
          : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[11px] text-[#64748B]">Total</p>
          <p className="text-sm font-bold text-white">{formatCurrency(total)}</p>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-6 lg:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function UsersGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-6 lg:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19a5 5 0 0 1 10 0" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 19a4.5 4.5 0 0 1 4 0" />
    </svg>
  );
}

function CrownGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-6 lg:w-6" fill="currentColor">
      <path d="M4 16 6 7l5 5 3-7 6 9v3H4z" />
      <rect x="5" y="18" width="14" height="2" rx="1" />
    </svg>
  );
}

function ChartGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-6 lg:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15v-4M12 15V8M16 15v-7" />
    </svg>
  );
}
