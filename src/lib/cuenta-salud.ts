import type { HealthStatus } from "@/components/ui/StatusBadge";

export const UMBRAL_ACTIVO_DIAS = 7;
export const UMBRAL_POR_VENCER_DIAS = 1;
export const FILAS_POR_PAGINA_OPCIONES = [10, 25, 50, 100] as const;
export type FilasPorPagina = (typeof FILAS_POR_PAGINA_OPCIONES)[number];
export const FILAS_POR_PAGINA_DEFAULT: FilasPorPagina = 50;

export type EstadoFiltro = "all" | HealthStatus;
export type VenceFiltro = "all" | "hoy" | "7" | "30" | "vencidas";
export type ComboFiltro = "all" | "2" | "3" | "4";

export function parseFilasPorPagina(value: string): FilasPorPagina {
  const parsed = Number.parseInt(value, 10);
  return FILAS_POR_PAGINA_OPCIONES.includes(parsed as FilasPorPagina)
    ? (parsed as FilasPorPagina)
    : FILAS_POR_PAGINA_DEFAULT;
}

export function isoFromToday(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function diasDesdeVencimiento(iso: string): number {
  const today = new Date();
  const hoy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const end = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(`${iso}T00:00:00`);
  return Math.round((end.getTime() - hoy.getTime()) / 86_400_000);
}

export function estadoDesdeDias(dias: number): HealthStatus {
  if (dias > UMBRAL_ACTIVO_DIAS) return "activo";
  if (dias >= UMBRAL_POR_VENCER_DIAS) return "por_vencer";
  return "vencido";
}

export function colorDias(status: HealthStatus): string {
  if (status === "activo") return "text-[#16A34A]";
  if (status === "por_vencer") return "text-[#FBBF24]";
  return "text-[#DC2626]";
}

export function formatDdMmYyyy(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function cumpleEstado(dias: number, estado: EstadoFiltro): boolean {
  if (estado === "all") return true;
  return estadoDesdeDias(dias) === estado;
}

export function cumpleVence(dias: number, vence: VenceFiltro): boolean {
  if (vence === "all") return true;
  if (vence === "hoy") return dias === 0;
  if (vence === "7") return dias >= 0 && dias <= 7;
  if (vence === "30") return dias >= 0 && dias <= 30;
  return dias < 0;
}

export function formatCosto(costo: number): string {
  return `S/ ${costo.toFixed(2)}`;
}
