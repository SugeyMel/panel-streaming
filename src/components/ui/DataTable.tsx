import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty = "No hay registros para mostrar.",
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0B111C] text-[#94A3B8]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-5 py-3 font-medium ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-[#94A3B8]">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[#253047] text-[#F8FAFC]">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`whitespace-nowrap px-5 py-3.5 ${column.className ?? ""}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {rows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[#94A3B8]">{empty}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-[#253047] bg-[#0B111C] p-4">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                  <span className="shrink-0 text-[#94A3B8]">{column.header}</span>
                  <span className="text-right text-[#F8FAFC]">{column.render(row)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
