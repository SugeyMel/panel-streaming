"use client";

import { SearchBar } from "@/components/ui/SearchBar";
import type { ComboFiltro, EstadoFiltro, VenceFiltro } from "@/lib/cuenta-salud";
import type { FiltroVencimiento } from "@/lib/vencimiento";
import {
  ComboOptions,
  EstadoFilterOptions,
  FilterSelect,
  VenceFilterOptions,
  VenceProveedorOptions,
} from "./FilterSelect";

const SEARCH_INPUT =
  "h-10 w-full rounded-lg border border-[#253047] bg-[#111827] py-0 pr-3 pl-10 text-sm text-[#E2E8F0] outline-none placeholder:text-[#94A3B8]";

const DATE_INPUT =
  "h-10 rounded-lg border border-[#253047] bg-[#111827] px-3 text-sm text-[#E2E8F0] outline-none focus:ring-2 focus:ring-[#2563EB]";

export function AccountsFilterBar({
  query,
  onQuery,
  searchPlaceholder,
  servicio,
  onServicio,
  servicios,
  servicioAllLabel = "Todos los servicios",
  estado,
  onEstado,
  vence,
  onVence,
  proveedor,
  onProveedor,
  proveedores,
  venceProveedor,
  onVenceProveedor,
  fechaProveedor,
  onFechaProveedor,
  showCombo = false,
  showProveedor = true,
  combo = "all",
  onCombo,
  stacked = false,
  tone = "dark",
}: {
  query: string;
  onQuery: (value: string) => void;
  searchPlaceholder: string;
  servicio: string;
  onServicio: (value: string) => void;
  servicios: string[];
  servicioAllLabel?: string;
  estado: EstadoFiltro;
  onEstado: (value: EstadoFiltro) => void;
  vence: VenceFiltro;
  onVence: (value: VenceFiltro) => void;
  proveedor: string;
  onProveedor: (value: string) => void;
  proveedores: string[];
  venceProveedor: FiltroVencimiento;
  onVenceProveedor: (value: FiltroVencimiento) => void;
  fechaProveedor: string;
  onFechaProveedor: (value: string) => void;
  showCombo?: boolean;
  showProveedor?: boolean;
  combo?: ComboFiltro;
  onCombo?: (value: ComboFiltro) => void;
  stacked?: boolean;
  tone?: "dark" | "light";
}) {
  const light = tone === "light";
  const selectClass = stacked ? "w-full min-w-0" : undefined;
  const venceProveedorClass = stacked ? "w-full min-w-0" : "min-w-[13.5rem] shrink-0";
  const searchClass = light
    ? "h-10 w-full rounded-lg border border-[#E2E8F0] bg-white py-0 pr-3 pl-10 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
    : SEARCH_INPUT;
  const dateClass = light
    ? "h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]"
    : DATE_INPUT;

  return (
    <div className={stacked ? "space-y-3" : "flex min-w-0 flex-wrap items-center gap-3"}>
      <SearchBar
        className={stacked ? "w-full" : "w-full lg:w-[320px]"}
        inputClassName={searchClass}
        value={query}
        onChange={onQuery}
        placeholder={searchPlaceholder}
      />
      <FilterSelect className={selectClass} value={servicio} onChange={onServicio} tone={tone}>
        <option value="all">{servicioAllLabel}</option>
        {servicios.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect className={selectClass} value={estado} onChange={(value) => onEstado(value as EstadoFiltro)} tone={tone}>
        <EstadoFilterOptions />
      </FilterSelect>
      <FilterSelect className={selectClass} value={vence} onChange={(value) => onVence(value as VenceFiltro)} tone={tone}>
        <VenceFilterOptions />
      </FilterSelect>
      {showProveedor ? (
        <>
          <FilterSelect className={selectClass} value={proveedor} onChange={onProveedor} tone={tone}>
            <option value="all">Proveedor: Todos</option>
            {proveedores.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            className={venceProveedorClass}
            value={venceProveedor}
            onChange={(value) => onVenceProveedor(value as FiltroVencimiento)}
            tone={tone}
          >
            <VenceProveedorOptions />
          </FilterSelect>
          {venceProveedor === "exacta" ? (
            <input
              type="date"
              value={fechaProveedor}
              onChange={(event) => onFechaProveedor(event.target.value)}
              className={`${dateClass} ${stacked ? "w-full" : "shrink-0"}`}
            />
          ) : null}
        </>
      ) : null}
      {showCombo && onCombo ? (
        <FilterSelect className={selectClass} value={combo} onChange={(value) => onCombo(value as ComboFiltro)} tone={tone}>
          <ComboOptions />
        </FilterSelect>
      ) : null}
    </div>
  );
}
