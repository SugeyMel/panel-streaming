"use client";

import { useEffect, useRef, useState } from "react";
import { changePasswordAction, signOutAction } from "@/app/actions/business";
import { ChevronDownIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function SellerUserMenu({
  name,
  email = "",
  roleLabel = "Vendedor",
}: {
  name: string;
  email?: string;
  roleLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<null | "profile" | "password">(null);
  const [message, setMessage] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const initial = (name.trim()[0] ?? roleLabel[0] ?? "U").toUpperCase();

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function openPanel(next: "profile" | "password") {
    setOpen(false);
    setMessage(null);
    setPanel(next);
  }

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
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-[#253047] bg-[#111827] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="truncate px-3 pt-2 text-sm font-semibold text-white">{name || roleLabel}</p>
          <p className="truncate px-3 pb-2 text-[11px] text-[#94A3B8]">{roleLabel}</p>
          <button
            type="button"
            className="block w-full px-3 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-[#172033]"
            onClick={() => openPanel("profile")}
          >
            Perfil
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-[#172033]"
            onClick={() => openPanel("password")}
          >
            Cambiar clave
          </button>
          <form action={signOutAction}>
            <button type="submit" className="w-full px-3 py-2.5 text-left text-sm text-[#EF4444] hover:bg-[#172033]">
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}

      <Modal open={panel === "profile"} title="Perfil" onClose={() => setPanel(null)}>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-[#94A3B8]">Nombre</p>
            <p className="mt-1 font-medium text-white">{name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Correo de acceso</p>
            <p className="mt-1 break-all text-white">{email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Rol</p>
            <p className="mt-1 text-white">{roleLabel}</p>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={() => openPanel("password")}>
            Cambiar clave
          </Button>
        </div>
      </Modal>

      <Modal open={panel === "password"} title="Cambiar clave" onClose={() => setPanel(null)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await changePasswordAction(formData);
            setMessage(result.ok ? "Clave actualizada." : result.error ?? "No se pudo cambiar");
            if (result.ok) setPanel(null);
          }}
        >
          <p className="text-xs text-[#94A3B8]">
            Estás dentro de tu cuenta. Aquí cambias la clave. Restablecer es solo si la olvidaste en el login.
          </p>
          {message ? <p className="text-xs text-red-300">{message}</p> : null}
          <input name="password" type="password" placeholder="Nueva clave (mín. 6)" className="ui-field" required minLength={6} />
          <input name="confirm" type="password" placeholder="Confirmar clave" className="ui-field" required minLength={6} />
          <Button type="submit" className="w-full">
            Guardar clave
          </Button>
        </form>
      </Modal>
    </div>
  );
}
