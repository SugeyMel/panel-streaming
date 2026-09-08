import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { FILAS_POR_PAGINA_OPCIONES, parseFilasPorPagina, type FilasPorPagina } from "@/lib/cuenta-salud";

export function AccountsPagination({
  total,
  rangeStart,
  rangeEnd,
  page,
  pageCount,
  onPage,
  filasPorPagina,
  onFilasPorPagina,
}: {
  total: number;
  rangeStart: number;
  rangeEnd: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  filasPorPagina: FilasPorPagina;
  onFilasPorPagina: (value: FilasPorPagina) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="shrink-0 text-sm text-[#94A3B8]">
        {total === 0 ? "Mostrando 0 - 0 de 0 cuentas" : `Mostrando ${rangeStart} - ${rangeEnd} de ${total} cuentas`}
      </p>
      <label className="inline-flex shrink-0 items-center gap-2 text-sm text-[#94A3B8]">
        Mostrar
        <select
          value={String(filasPorPagina)}
          onChange={(event) => onFilasPorPagina(parseFilasPorPagina(event.target.value))}
          className="h-9 w-[4.75rem] shrink-0 rounded-lg border border-[#253047] bg-[#0B111C] px-2 text-sm text-[#F8FAFC] outline-none"
        >
          {FILAS_POR_PAGINA_OPCIONES.map((size) => (
            <option key={size} value={String(size)}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="ml-auto">
        <Pager page={page} pageCount={pageCount} onPage={onPage} />
      </div>
    </div>
  );
}

function Pager({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#94A3B8] disabled:opacity-40"
        disabled={page <= 1}
        aria-label="Anterior"
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPage(item)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${
            page === item ? "bg-[#2563EB] text-white" : "bg-transparent text-[#94A3B8] hover:bg-[#172033]"
          }`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#94A3B8] disabled:opacity-40"
        disabled={page >= pageCount}
        aria-label="Siguiente"
        onClick={() => onPage(page + 1)}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
