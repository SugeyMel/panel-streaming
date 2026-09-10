"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminIncomePanels, IncomeMonthCard } from "@/components/admin/AdminIncomePanels";
import { ChevronDownIcon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import {
  inSelectedMonth,
  monthChangeHint,
  previousMonthKey,
  wholesaleAmountInMonth,
  type AdminHomePayload,
} from "@/lib/admin-home";

export function AdminHomeDashboard({ data }: { data: AdminHomePayload }) {
  const [month, setMonth] = useState(data.defaultMonth);

  const sellersThisMonth = data.sellers.filter((item) => inSelectedMonth(item.registeredAt, month)).length;
  const customersThisMonth = data.customers.filter((item) => inSelectedMonth(item.registeredAt, month)).length;
  const sellersActive = data.sellers.filter((item) => item.status === "activo").length;
  const sellersOther = Math.max(0, data.sellers.length - sellersActive);
  const customersActive = data.customers.filter((item) => item.status === "activo").length;
  const customersInactive = data.customers.length - customersActive;
  const rental = 0;
  const rentalHealthReady = false;
  const platforms = wholesaleAmountInMonth(data.wholesaleSales, month);
  const wholesaleHint = monthChangeHint(
    platforms,
    wholesaleAmountInMonth(data.wholesaleSales, previousMonthKey(month)),
  );

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
          hint="Todavía no hay cobros"
          icon={<CrownGlyph />}
          iconClass="bg-[#6D28D9]/50 text-[#DDD6FE]"
          cardClass="bg-[#2e1065]/80"
        />
        <KpiCard
          label="Plataformas al mayoreo"
          value={formatCurrency(platforms)}
          hint={wholesaleHint}
          icon={<ChartGlyph />}
          iconClass="bg-[#9F1239]/50 text-[#FDA4AF]"
          cardClass="bg-[#4c0519]/80"
        />
      </div>

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

      <IncomeMonthCard rental={rental} wholesale={platforms} />

      <AdminIncomePanels
        months={data.months}
        defaultMonth={data.defaultMonth}
        month={month}
        wholesaleSales={data.wholesaleSales}
        hideHeader
      />
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
        <p className="mt-0.5 truncate text-[10px] font-medium text-[#4ADE80] lg:mt-1 lg:text-sm">{hint}</p>
      </div>
    </article>
  );
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
