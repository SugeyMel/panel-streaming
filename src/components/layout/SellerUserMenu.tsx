"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/business";
import { ChevronDownIcon } from "@/components/icons";

export function SellerUserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const initial = (name.trim()[0] ?? "V").toUpperCase();

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="flex items-center gap-0.5"
        aria-label="Menú de usuario"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] text-sm font-semibold text-white">
          {initial}
        </span>
        <ChevronDownIcon className="hidden h-4 w-4 text-[#94A3B8] sm:block" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-[#253047] bg-[#111827] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="truncate px-3 py-2 text-xs text-[#94A3B8]">{name || "Vendedor"}</p>
          <Link
            href="/panel/configuracion"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-[#F8FAFC] hover:bg-[#172033]"
          >
            Configuración
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="w-full px-3 py-2.5 text-left text-sm text-[#EF4444] hover:bg-[#172033]">
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
