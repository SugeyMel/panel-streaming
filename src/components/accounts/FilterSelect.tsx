import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

export function FilterSelect({
  value,
  onChange,
  children,
  className = "min-w-[10.5rem] shrink-0",
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-[#253047] bg-[#111827] py-0 pr-8 pl-3 text-sm text-[#E2E8F0] outline-none focus:ring-2 focus:ring-[#2563EB]"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
    </div>
  );
}

export function EstadoFilterOptions() {
  return (
    <>
      <option value="all">Todos los estados</option>
      <option value="activo">Activo</option>
      <option value="por_vencer">Por vencer</option>
      <option value="vencido">Vencido</option>
    </>
  );
}

export function VenceFilterOptions() {
  return (
    <>
      <option value="all">Vence: Todos</option>
      <option value="hoy">Vence: Hoy</option>
      <option value="7">Vence: 7 días</option>
      <option value="30">Vence: 30 días</option>
      <option value="vencidas">Vencidas</option>
    </>
  );
}

export function VenceProveedorOptions() {
  return (
    <>
      <option value="all">Vence proveedor: Todos</option>
      <option value="hoy">Vence hoy</option>
      <option value="7">Próximos 7 días</option>
      <option value="30">Próximos 30 días</option>
      <option value="vencidas">Ya vencidas</option>
      <option value="exacta">Fecha exacta…</option>
    </>
  );
}

export function ComboOptions() {
  return (
    <>
      <option value="all">Combos: —</option>
      <option value="2">2 servicios</option>
      <option value="3">3 servicios</option>
      <option value="4">4 servicios</option>
    </>
  );
}
