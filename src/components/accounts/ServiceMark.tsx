export const SERVICIO_COLOR: Record<string, string> = {
  "HBO MAX": "bg-[#6B21A8]",
  Netflix: "bg-[#B91C1C]",
  "Disney+": "bg-[#1D4ED8]",
  "Prime Video": "bg-[#0F766E]",
  "Paramount+": "bg-[#0369A1]",
  Crunchyroll: "bg-[#C2410C]",
  "Star+": "bg-[#7C3AED]",
  Spotify: "bg-[#15803D]",
};

export function ServiceMark({ name }: { name: string }) {
  const color = SERVICIO_COLOR[name] ?? "bg-[#334155]";
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${color}`}>
      {name.slice(0, 1)}
    </span>
  );
}
