export default function SellerSettingsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando configuración">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#172033]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#111827]" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="hidden h-64 w-52 shrink-0 animate-pulse rounded-2xl border border-[#253047] bg-[#111827] lg:block" />
        <div className="min-h-[28rem] min-w-0 flex-1 animate-pulse rounded-2xl border border-[#253047] bg-[#111827]" />
      </div>
    </div>
  );
}
