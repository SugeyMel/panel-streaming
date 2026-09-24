"use client";

import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { GripIcon } from "@/components/icons";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

function moveId(ids: string[], fromId: string, toId: string) {
  if (fromId === toId) return ids;
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, fromId);
  return next;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty = "No hay registros para mostrar.",
  mobileRender,
  onReorder,
  forceTable = false,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  mobileRender?: (row: T) => ReactNode;
  onReorder?: (orderedIds: string[]) => void;
  /** Muestra siempre la tabla completa (también en celular), por ejemplo dentro de un contenedor con zoom. */
  forceTable?: boolean;
}) {
  const [ids, setIds] = useState(() => rows.map((row) => row.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    setIds((prev) => {
      const incoming = rows.map((row) => row.id);
      const kept = prev.filter((id) => incoming.includes(id));
      const added = incoming.filter((id) => !prev.includes(id));
      if (kept.length === incoming.length && added.length === 0) {
        return prev;
      }
      return [...kept, ...added];
    });
  }, [rows]);

  const byId = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = ids.map((id) => byId.get(id)).filter((row): row is T => Boolean(row));

  function startDrag(event: DragEvent, id: string) {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function draggedId(event: DragEvent) {
    return event.dataTransfer.getData("text/plain") || dragId;
  }

  function dropOn(event: DragEvent, targetId: string) {
    event.preventDefault();
    const fromId = draggedId(event);
    setDragId(null);
    setOverId(null);
    if (!fromId || !onReorder) return;
    const next = moveId(ids, fromId, targetId);
    if (next === ids || next.join() === ids.join()) return;
    setIds(next);
    onReorder(next);
  }

  const sortable = Boolean(onReorder);

  return (
    <div>
      <div className={forceTable ? "overflow-x-auto" : "hidden overflow-x-auto md:block"}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0B111C] text-[#94A3B8]">
            <tr>
              {sortable ? <th className="w-10 px-3 py-3 font-medium" aria-label="Orden" /> : null}
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
            {orderedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (sortable ? 1 : 0)} className="px-5 py-8 text-center text-[#94A3B8]">
                  {empty}
                </td>
              </tr>
            ) : (
              orderedRows.map((row) => (
                <tr
                  key={row.id}
                  onDragOver={
                    sortable
                      ? (event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setOverId(row.id);
                        }
                      : undefined
                  }
                  onDrop={sortable ? (event) => dropOn(event, row.id) : undefined}
                  onDragLeave={sortable ? () => setOverId((current) => (current === row.id ? null : current)) : undefined}
                  className={`border-t border-[#253047] text-[#F8FAFC] ${
                    dragId === row.id ? "opacity-50" : ""
                  } ${overId === row.id && dragId && overId !== dragId ? "bg-[#172033]" : ""}`}
                >
                  {sortable ? (
                    <td className="w-10 px-2 py-3.5">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => startDrag(event, row.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverId(null);
                        }}
                        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-[#64748B] hover:bg-white/5 hover:text-[#E2E8F0] active:cursor-grabbing"
                        aria-label="Mover fila"
                        title="Arrastra para cambiar el orden"
                      >
                        <GripIcon className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
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
      <div className={forceTable ? "hidden" : "space-y-3 p-3 md:hidden"}>
        {orderedRows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[#94A3B8]">{empty}</p>
        ) : mobileRender ? (
          orderedRows.map((row) => (
            <div
              key={row.id}
              onDragOver={
                sortable
                  ? (event) => {
                      event.preventDefault();
                      setOverId(row.id);
                    }
                  : undefined
              }
              onDrop={sortable ? (event) => dropOn(event, row.id) : undefined}
              className={overId === row.id && dragId && overId !== dragId ? "rounded-2xl ring-1 ring-[#7C3AED]" : ""}
            >
              {sortable ? (
                <div className="mb-1 flex justify-end">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => startDrag(event, row.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-[#94A3B8]"
                  >
                    <GripIcon className="h-4 w-4" />
                    Mover
                  </button>
                </div>
              ) : null}
              {mobileRender(row)}
            </div>
          ))
        ) : (
          orderedRows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-[#253047] bg-[#0B111C] p-4">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                  <span className="shrink-0 text-[#94A3B8]">{column.header}</span>
                  <span className="min-w-0 text-right break-words text-[#F8FAFC]">{column.render(row)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
