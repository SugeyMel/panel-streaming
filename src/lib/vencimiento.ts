export type FiltroVencimiento = "all" | "hoy" | "7" | "30" | "vencidas" | "exacta";

function parseDiaLocal(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function diasHasta(isoFecha: string, ahora: Date): number | null {
  const fin = parseDiaLocal(isoFecha);
  if (!fin) return null;
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

export function filtrarPorVencimiento(
  isoFecha: string,
  filtro: FiltroVencimiento,
  fechaExacta: string | null = null,
  ahora: Date = new Date(),
): boolean {
  if (filtro === "all") return true;
  if (filtro === "exacta") {
    if (!fechaExacta) return true;
    const dia = parseDiaLocal(isoFecha);
    const elegido = parseDiaLocal(fechaExacta);
    if (!dia || !elegido) return false;
    return dia.getTime() === elegido.getTime();
  }

  const dias = diasHasta(isoFecha, ahora);
  if (dias === null) return false;
  if (filtro === "hoy") return dias === 0;
  if (filtro === "7") return dias >= 0 && dias <= 7;
  if (filtro === "30") return dias >= 0 && dias <= 30;
  return dias < 0;
}
