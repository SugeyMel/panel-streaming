"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChatIcon, ClockIcon, RefreshIcon, WhatsAppIcon } from "@/components/icons";
import {
  construirEnlaceWhatsapp,
  type DestinoWhatsapp,
  type PlantillasWhatsapp,
  type TipoMensajeWhatsapp,
} from "@/lib/whatsapp";

const MENU_WIDTH = 210;
const MENU_GAP = 8;
const MENU_ESTIMATED_HEIGHT = 138;

const ITEMS: Array<{ tipo: TipoMensajeWhatsapp; label: string; Icon: typeof ClockIcon }> = [
  { tipo: "recordar", label: "Recordar vencimiento", Icon: ClockIcon },
  { tipo: "renovar", label: "Ofrecer renovación", Icon: RefreshIcon },
  { tipo: "escribir", label: "Escribir mensaje", Icon: ChatIcon },
];

export function WhatsAppMenu({
  destino,
  plantillas,
  tone = "dark",
}: {
  destino: DestinoWhatsapp | null;
  plantillas?: PlantillasWhatsapp;
  tone?: "dark" | "light";
}) {
  const enabled = Boolean(destino && construirEnlaceWhatsapp({ ...destino, plantillas }));
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  function placeMenu() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const openUp = spaceBelow < MENU_ESTIMATED_HEIGHT && rect.top > MENU_ESTIMATED_HEIGHT + MENU_GAP;
    const top = openUp ? rect.top - MENU_GAP - MENU_ESTIMATED_HEIGHT : rect.bottom + MENU_GAP;
    const maxLeft = window.innerWidth - MENU_WIDTH - 8;
    setCoords({ top, left: Math.max(8, Math.min(rect.left, maxLeft)) });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onReposition() {
      placeMenu();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function openLink(tipo: TipoMensajeWhatsapp) {
    if (!destino) return;
    const href = construirEnlaceWhatsapp({ ...destino, tipo, plantillas });
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % ITEMS.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + ITEMS.length) % ITEMS.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(ITEMS.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLink(ITEMS[activeIndex].tipo);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={!enabled}
        title="Escribir por WhatsApp"
        aria-label="Escribir por WhatsApp"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={
          enabled
            ? "relative inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[rgba(37,211,102,0.45)] bg-[#25D366] text-white shadow-[0_0_0_3px_rgba(37,211,102,0.12)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[#1FB855] hover:shadow-[0_0_0_3px_rgba(37,211,102,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] active:scale-[0.96]"
            : tone === "light"
              ? "relative inline-flex h-[34px] w-[34px] cursor-not-allowed items-center justify-center rounded-lg border border-[#FDE68A] bg-[#FEF3C7] text-[#D97706]"
              : "relative inline-flex h-[34px] w-[34px] cursor-not-allowed items-center justify-center rounded-lg border border-transparent bg-[#1F2937] text-[#64748B]"
        }
        onClick={() => {
          if (!enabled) return;
          setActiveIndex(0);
          setOpen((current) => !current);
        }}
      >
        <WhatsAppIcon className="h-[18px] w-[18px]" />
        {enabled ? null : tone === "light" ? null : (
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-amber-400" aria-hidden />
        )}
      </button>
      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Acciones de WhatsApp"
              tabIndex={-1}
              style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
              className="fixed z-[80] rounded-xl border border-[#253047] bg-[#111827] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
              onKeyDown={onMenuKey}
            >
              {ITEMS.map((item, index) => {
                const Icon = item.Icon;
                const active = index === activeIndex;
                return (
                  <button
                    key={item.tipo}
                    type="button"
                    role="menuitem"
                    tabIndex={active ? 0 : -1}
                    className={`flex h-[38px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-[#E2E8F0] ${
                      active ? "bg-[#1B2436]" : "hover:bg-[#1B2436]"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openLink(item.tipo)}
                    ref={(node) => {
                      if (active && open && node && document.activeElement !== node) {
                        node.focus();
                      }
                    }}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#E2E8F0]" : "text-[#94A3B8]"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
