"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { changePasswordAction, signOutAction, updateCustomerNicknameAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function CustomerUserMenu({
  name,
  email = "",
}: {
  name: string;
  email?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<null | "password" | "nickname">(null);
  const [message, setMessage] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const initial = (name.trim()[0] ?? "C").toUpperCase();

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function openPanel(next: "password" | "nickname") {
    setOpen(false);
    setMessage(null);
    setPanel(next);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="flex items-center gap-2"
        aria-label="Menú de mi cuenta"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="hidden leading-tight text-left lg:block">
          <span className="block text-sm font-semibold text-white">{name || "Cliente"}</span>
          <span className="block text-[11px] text-[#94A3B8]">Cliente</span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-semibold text-white">
          {initial}
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-[#253047] bg-[#111827] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="truncate px-3 pt-2 text-sm font-semibold text-white">{name || "Cliente"}</p>
          <p className="truncate px-3 pb-2 text-[11px] text-[#94A3B8]">
            {email && !email.endsWith("@wa.panel.local") ? email : "Cliente"}
          </p>
          <Link
            href="/cliente/cuenta"
            className="block w-full px-3 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-[#172033]"
            onClick={() => setOpen(false)}
          >
            Mi cuenta
          </Link>
          <button
            type="button"
            className="block w-full px-3 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-[#172033]"
            onClick={() => openPanel("password")}
          >
            Cambiar contraseña
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-[#172033]"
            onClick={() => openPanel("nickname")}
          >
            Editar apodo
          </button>
          <form action={signOutAction}>
            <button type="submit" className="w-full px-3 py-2.5 text-left text-sm text-[#EF4444] hover:bg-[#172033]">
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}

      <Modal open={panel === "password"} title="Cambiar contraseña" onClose={() => setPanel(null)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await changePasswordAction(formData);
            setMessage(result.ok ? "Contraseña actualizada." : result.error ?? "No se pudo cambiar");
            if (result.ok) setPanel(null);
          }}
        >
          <p className="text-xs text-[#94A3B8]">Escribe la nueva clave de acceso a tu cuenta.</p>
          {message && panel === "password" ? <p className="text-xs text-red-300">{message}</p> : null}
          <input name="password" type="password" placeholder="Nueva clave (mín. 6)" className="ui-field" required minLength={6} />
          <input name="confirm" type="password" placeholder="Confirmar clave" className="ui-field" required minLength={6} />
          <Button type="submit" className="w-full">
            Guardar contraseña
          </Button>
        </form>
      </Modal>

      <Modal open={panel === "nickname"} title="Editar apodo" onClose={() => setPanel(null)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await updateCustomerNicknameAction(formData);
            setMessage(result.ok ? "Apodo actualizado." : result.error ?? "No se pudo guardar");
            if (result.ok) {
              setPanel(null);
              router.refresh();
            }
          }}
        >
          <p className="text-xs text-[#94A3B8]">Así te verán en el panel. El WhatsApp de acceso no cambia.</p>
          {message && panel === "nickname" ? <p className="text-xs text-red-300">{message}</p> : null}
          <input
            name="nickname"
            defaultValue={name}
            placeholder="Tu apodo"
            className="ui-field"
            required
            minLength={2}
            maxLength={40}
          />
          <Button type="submit" className="w-full">
            Guardar apodo
          </Button>
        </form>
      </Modal>
    </div>
  );
}
