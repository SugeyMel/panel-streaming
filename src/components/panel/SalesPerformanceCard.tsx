"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, UsersIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import {
  computeSalesPerformance,
  yAxisTicks,
  type Grain,
  type PaidSale,
  type PeriodId,
} from "@/lib/sales-performance";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-3.5 w-3.5 shrink-0 ${className ?? ""}`} aria-hidden>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h9.4a1.5 1.5 0 0 0 1.5-1.2L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-3.5 w-3.5 shrink-0 ${className ?? ""}`} aria-hidden>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
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

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 48 };

export function SalesPerformanceCard({
  sales,
  reportsHref,
}: {
  sales: PaidSale[];
  reportsHref: string;
}) {
  const [period, setPeriod] = useState<PeriodId>("este_mes");
  const [grain, setGrain] = useState<Grain>("dia");
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const view = useMemo(() => computeSalesPerformance(sales, period, grain), [sales, period, grain]);
  const maxAmount = Math.max(0, ...view.points.map((item) => item.amount));
  const scale = yAxisTicks(maxAmount);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const coords = view.points.map((item, index) => {
    const x =
      view.points.length === 1
        ? PAD.left + plotW / 2
        : PAD.left + (index / (view.points.length - 1)) * plotW;
    const y = PAD.top + plotH - (item.amount / scale.max) * plotH;
    return { x, y };
  });
  const line = curvePath(coords);
  const area =
    coords.length === 0
      ? ""
      : `${line} L ${coords[coords.length - 1].x} ${PAD.top + plotH} L ${coords[0].x} ${PAD.top + plotH} Z`;

  return (
    <section className="max-md:max-h-[380px] overflow-hidden rounded-xl border border-[#253047] bg-[#111827] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-sm font-semibold text-[#F8FAFC] md:text-base">Rendimiento de ventas</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={reportsHref} className="text-xs font-medium text-[#38BDF8]">
            Ver reportes
          </Link>
          <div className="relative">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodId)}
              className="h-8 appearance-none rounded-lg border border-[#253047] bg-[#0B111C] py-0 pr-7 pl-2 text-[11px] text-[#E2E8F0] outline-none"
              aria-label="Periodo"
            >
              <option value="este_mes">Este mes</option>
              <option value="mes_pasado">Mes pasado</option>
              <option value="ultimos_3">Últimos 3 meses</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          </div>
        </div>
      </div>

      <div className="mb-3 flex gap-1">
        {(
          [
            ["dia", "Día"],
            ["semana", "Semana"],
            ["mes", "Mes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setGrain(id)}
            className={`rounded-lg px-3 py-1 text-[11px] font-semibold ${
              grain === id ? "bg-[#2563EB] text-white" : "bg-transparent text-[#94A3B8]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative h-[160px] w-full md:h-[200px]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(96,165,250,0.25)" />
              <stop offset="100%" stopColor="rgba(96,165,250,0)" />
            </linearGradient>
          </defs>
          {scale.ticks.map((tick) => {
            const y = PAD.top + plotH - (tick / scale.max) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="#253047"
                  strokeOpacity="0.7"
                />
                <text x={PAD.left - 8} y={y + 3} textAnchor="end" fill="#64748B" fontSize="10">
                  {`S/ ${Math.round(tick)}`}
                </text>
              </g>
            );
          })}
          {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
          {line ? <path d={line} fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round" /> : null}
          {coords.map((point, index) => (
            <g key={view.points[index].key}>
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              />
              <circle cx={point.x} cy={point.y} r="4" fill="#60A5FA" stroke="#1E40AF" strokeWidth="1.5" />
            </g>
          ))}
          {view.points.map((item, index) => (
            <text
              key={`${item.key}-x`}
              x={coords[index].x}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="10"
            >
              {item.label}
            </text>
          ))}
        </svg>
        {view.empty ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#64748B]">
            Sin ventas en este periodo
          </p>
        ) : null}
        {hover !== null && view.points[hover] ? (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-[#253047] bg-[#0B111C] px-2 py-1 text-[11px] text-[#F8FAFC] shadow"
            style={{
              left: `${(coords[hover].x / WIDTH) * 100}%`,
              top: `${Math.max(0, (coords[hover].y / HEIGHT) * 100 - 18)}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p>{view.points[hover].tooltip}</p>
            <p className="font-semibold">{formatCurrency(view.points[hover].amount)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <span className="mb-1 inline-grid h-7 w-7 min-h-7 min-w-7 shrink-0 aspect-square place-items-center rounded-full border border-[#2563EB]/50 text-[#60A5FA]">
            <CartIcon className="h-3.5 w-3.5" />
          </span>
          <p className="text-[9px] text-[#94A3B8]">Total vendido</p>
          <p className="truncate text-sm font-bold text-[#F8FAFC]">{view.totalLabel}</p>
          <p
            className={`flex items-center gap-0.5 truncate text-[9px] ${
              view.variationTone === "up" ? "text-emerald-400" : view.variationTone === "down" ? "text-red-400" : "text-[#64748B]"
            }`}
          >
            {view.variationTone === "up" ? <ChevronUpIcon className="h-3 w-3 shrink-0" /> : null}
            {view.variationTone === "down" ? <ChevronDownIcon className="h-3 w-3 shrink-0" /> : null}
            {view.variationLabel}
          </p>
        </div>
        <div className="min-w-0">
          <span className="mb-1 inline-grid h-7 w-7 min-h-7 min-w-7 shrink-0 aspect-square place-items-center rounded-full border border-[#2563EB]/50 text-[#60A5FA]">
            <UsersIcon className="h-3.5 w-3.5" />
          </span>
          <p className="truncate text-sm font-bold text-[#F8FAFC]">{view.salesLabel}</p>
          <p className="truncate text-[9px] text-[#64748B]">{view.salesHint}</p>
        </div>
        <div className="min-w-0">
          <span className="mb-1 inline-grid h-7 w-7 min-h-7 min-w-7 shrink-0 aspect-square place-items-center rounded-full border border-[#2563EB]/50 text-[#60A5FA]">
            <PersonIcon className="h-3.5 w-3.5" />
          </span>
          <p className="truncate text-sm font-bold text-[#F8FAFC]">{view.clientsLabel}</p>
          <p className="truncate text-[9px] text-[#64748B]">{view.clientsHint}</p>
        </div>
      </div>
    </section>
  );
}
