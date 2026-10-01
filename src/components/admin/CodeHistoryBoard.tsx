"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CodeHistoryRow } from "@/lib/code-history";

const field =
  "h-10 rounded-xl border border-[#253047] bg-[#0B111C] px-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50";

const RESULT: Record<string, { label: string; className: string }> = {
  FOUND: { label: "Encontrado", className: "bg-[#16A34A] text-white" },
  NOT_FOUND: { label: "Sin código", className: "bg-[#F59E0B] text-[#1C1917]" },
  DENIED: { label: "Denegado", className: "bg-[#DC2626] text-white" },
  RATE_LIMITED: { label: "Límite alcanzado", className: "bg-[#7C3AED] text-white" },
  PAUSED: { label: "Cuenta pausada", className: "bg-[#DC2626] text-white" },
  PENDING_APPROVAL: { label: "Esperando aprobación", className: "bg-[#D97706] text-white" },
  WARNING_ACCEPTED: { label: "Aceptó el aviso", className: "bg-[#B91C1C] text-white" },
  EXPIRED: { label: "Solicitud cancelada", className: "bg-[#64748B] text-white" },
};

const RANGES = [
  { value: "1", label: "Hoy" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
] as const;

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfRange(days: string) {
  if (days === "1") {
    const now = new Date();
    const lima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
    return now.getTime() - (lima.getHours() * 3600 + lima.getMinutes() * 60 + lima.getSeconds()) * 1000;
  }
  return Date.now() - Number(days) * 86400000;
}

export function CodeHistoryBoard({
  rows,
  platforms,
}: {
  rows: CodeHistoryRow[];
  platforms: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [platformId, setPlatformId] = useState("all");
  const [result, setResult] = useState("all");
  const [range, setRange] = useState("7");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = startOfRange(range);
    return rows.filter((row) => {
      if (Date.parse(row.at) < since) return false;
      if (kind !== "all" && row.kind !== kind) return false;
      if (platformId !== "all" && row.platformId !== platformId) return false;
      if (result !== "all" && row.result !== result) return false;
      if (!q) return true;
      return [row.who, row.email, row.sellerName].some((value) => value.toLowerCase().includes(q));
    });
  }, [rows, query, kind, platformId, result, range]);

  const totals = useMemo(
    () => ({
      all: visible.length,
      found: visible.filter((row) => row.result === "FOUND").length,
      failed: visible.filter((row) => row.result !== "FOUND").length,
    }),
    [visible],
  );

  const platformName = (id: string) => platforms.find((item) => item.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Historial de códigos"
        description="Todas las solicitudes de códigos de tus vendedores y clientes. Aquí nunca se muestra el código."
      />

      <div className="mb-3 grid grid-cols-3 gap-2 sm:max-w-md">
        <Stat label="Solicitudes" value={totals.all} className="text-white" />
        <Stat label="Encontrados" value={totals.found} className="text-emerald-300" />
        <Stat label="Sin éxito" value={totals.failed} className="text-amber-300" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o correo"
          className={`${field} w-full sm:w-64`}
        />
        <select value={range} onChange={(event) => setRange(event.target.value)} className={field}>
          {RANGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(event) => setKind(event.target.value)} className={field}>
          <option value="all">Vendedores y clientes</option>
          <option value="vendedor">Solo vendedores</option>
          <option value="cliente">Solo clientes</option>
        </select>
        <select value={platformId} onChange={(event) => setPlatformId(event.target.value)} className={field}>
          <option value="all">Todas las plataformas</option>
          {platforms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select value={result} onChange={(event) => setResult(event.target.value)} className={field}>
          <option value="all">Todos los resultados</option>
          {Object.entries(RESULT).map(([key, item]) => (
            <option key={key} value={key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <DataTable
          rows={visible}
          empty="No hay solicitudes de códigos en este periodo."
          columns={[
            { key: "at", header: "Fecha y hora", render: (row) => <span className="whitespace-nowrap">{formatWhen(row.at)}</span> },
            {
              key: "who",
              header: "Quién",
              render: (row) => (
                <div className="leading-tight">
                  <p className="font-medium text-white">{row.who}</p>
                  {row.kind === "cliente" && row.sellerName ? (
                    <p className="text-xs text-[#94A3B8]">de {row.sellerName}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: "kind",
              header: "Tipo",
              render: (row) => (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    row.kind === "vendedor" ? "bg-[#2563EB]/20 text-[#93C5FD]" : "bg-[#DB2777]/20 text-[#F9A8D4]"
                  }`}
                >
                  {row.kind === "vendedor" ? "Vendedor" : "Cliente"}
                </span>
              ),
            },
            { key: "platform", header: "Plataforma", render: (row) => platformName(row.platformId) },
            { key: "email", header: "Correo de la cuenta", render: (row) => row.email || "—" },
            {
              key: "result",
              header: "Resultado",
              render: (row) => {
                const item = RESULT[row.result] ?? { label: row.result || "—", className: "bg-[#334155] text-white" };
                return (
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.className}`}>
                    {item.label}
                  </span>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-xl border border-[#253047] bg-[#111827] px-3 py-2">
      <p className={`text-lg font-bold leading-none ${className}`}>{value}</p>
      <p className="mt-1 text-[11px] text-[#94A3B8]">{label}</p>
    </div>
  );
}
