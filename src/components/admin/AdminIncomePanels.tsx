"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  previousMonthKey,
  wholesaleAmountInMonth,
  type AdminWholesaleIncome,
  type MonthOption,
} from "@/lib/admin-home";

const RENTAL = { key: "rental", label: "Alquiler de panel", color: "#8B5CF6" } as const;
const WHOLESALE = { key: "platforms", label: "Plataformas al mayoreo", color: "#F59E0B" } as const;

export function AdminIncomePanels({
  months,
  defaultMonth,
  wholesaleSales,
  month: monthProp,
  hideHeader = false,
}: {
  months: MonthOption[];
  defaultMonth: string;
  wholesaleSales: AdminWholesaleIncome[];
  month?: string;
  hideHeader?: boolean;
}) {
  const [internalMonth, setInternalMonth] = useState(defaultMonth);
  const month = monthProp ?? internalMonth;
  const rental = 0;
  const platforms = wholesaleAmountInMonth(wholesaleSales, month);
  const totalIncome = rental + platforms;
  const prevKey = previousMonthKey(month);
  const prevWholesale = wholesaleAmountInMonth(wholesaleSales, prevKey);
  const prevTotal = prevWholesale;
  const deltaPct = prevTotal > 0 ? Math.round(((totalIncome - prevTotal) / prevTotal) * 100) : totalIncome > 0 ? null : 0;
  const bars = [
    { ...RENTAL, amount: rental },
    { ...WHOLESALE, amount: platforms },
  ];
  const recent = [...wholesaleSales]
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
    .slice(0, 8);

  return (
    <div className="space-y-2 lg:space-y-2.5">
      {hideHeader ? null : (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white lg:text-base">Tu negocio</h2>
          <label className="relative shrink-0">
            <span className="sr-only">Período</span>
            <select
              value={month}
              onChange={(event) => setInternalMonth(event.target.value)}
              className="h-8 appearance-none rounded-lg border border-[#253047] bg-[#111827] py-0 pr-8 pl-3 text-[11px] text-[#F1F5F9] outline-none lg:h-9 lg:text-sm"
            >
              {months.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          </label>
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)] lg:gap-2.5">
        <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white lg:text-base">Ingresos por categoría</h3>
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
              {deltaPct === null ? "—" : `${deltaPct > 0 ? "+" : ""}${deltaPct}%`}
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white lg:text-base">Evolución de ingresos</h3>
          <LegendDot color={WHOLESALE.color} label={WHOLESALE.label} />
        </div>
        <EvolutionChart rental={rental} platforms={platforms} />
      </section>

      <section className="rounded-xl border border-[#253047] bg-[#111827] p-2.5 lg:rounded-2xl lg:p-4">
        <h3 className="mb-2 text-sm font-semibold text-white lg:text-base">Últimas ventas mayoristas</h3>
        {recent.length === 0 ? (
          <p className="py-5 text-center text-sm text-[#64748B]">Todavía no hay ventas en Mayorista → Ventas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <thead className="text-xs text-[#64748B]">
                <tr>
                  <th className="pb-3 font-medium">Vendedor</th>
                  <th className="pb-3 font-medium">Monto</th>
                  <th className="pb-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item, index) => (
                  <tr key={`${item.sellerName}-${item.purchasedAt}-${index}`} className="border-t border-[#253047]">
                    <td className="py-3 font-medium text-white">{item.sellerName}</td>
                    <td className="py-3 text-[#E2E8F0]">{formatCurrency(item.amount)}</td>
                    <td className="py-3 text-[#94A3B8]">{formatDate(item.purchasedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
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
          <path d={curvePath(rentalPts)} fill="none" stroke={RENTAL.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d={curvePath(wholesalePts)} fill="none" stroke={WHOLESALE.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function IncomeMonthCard({
  rental,
  wholesale,
}: {
  rental: number;
  wholesale: number;
}) {
  const total = rental + wholesale;
  return (
    <section className="rounded-xl border border-[#253047] bg-[#111827] p-3 lg:rounded-2xl lg:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#94A3B8]">Ingresos del mes</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white">{formatCurrency(total)}</p>
          <p className="mt-1 text-[11px] text-[#94A3B8]">
            Alquiler {formatCurrency(rental)} · Mayoreo {formatCurrency(wholesale)}
          </p>
        </div>
        <Link
          href="/admin/finanzas"
          className="rounded-lg border border-[#253047] bg-[#0B0F1A] px-3 py-2 text-sm font-semibold text-[#A78BFA] hover:border-[#7C3AED]"
        >
          Ver finanzas
        </Link>
      </div>
    </section>
  );
}
