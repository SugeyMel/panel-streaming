export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#172033]" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#111827]" />
      <div className="min-h-[22rem] animate-pulse rounded-2xl border border-[#253047] bg-[#111827]" />
    </div>
  );
}
