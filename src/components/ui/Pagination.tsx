export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/6 px-5 py-3 text-xs text-slate-400">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button type="button" className="rounded-lg border border-white/10 px-3 py-1" disabled>
          Anterior
        </button>
        <button type="button" className="rounded-lg border border-white/10 px-3 py-1" disabled>
          Siguiente
        </button>
      </div>
    </div>
  );
}
