"use client";

import type { ReactNode } from "react";
import { EyeIcon, MoreIcon, PencilIcon } from "@/components/icons";
import { WhatsAppMenu } from "@/components/accounts/WhatsAppMenu";
import type { DestinoWhatsapp, PlantillasWhatsapp } from "@/lib/whatsapp";

export { WhatsAppMenu } from "@/components/accounts/WhatsAppMenu";

const actionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded text-[#94A3B8] hover:text-white";
const actionBtnClassLight =
  "inline-flex h-8 w-8 items-center justify-center rounded text-[#94A3B8] hover:text-[#0F172A]";

export function IconBtn({
  label,
  onClick,
  children,
  tone = "dark",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <button
      type="button"
      className={tone === "light" ? actionBtnClassLight : actionBtnClass}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AccountRowActions({
  whatsapp,
  plantillas,
  onView,
  onEdit,
  onMore,
  tone = "dark",
}: {
  whatsapp?: DestinoWhatsapp | null;
  plantillas?: PlantillasWhatsapp;
  onView: () => void;
  onEdit: () => void;
  onMore: () => void;
  tone?: "dark" | "light";
}) {
  return (
    <>
      <WhatsAppMenu destino={whatsapp ?? null} plantillas={plantillas} tone={tone} />
      <IconBtn label="Ver" onClick={onView} tone={tone}>
        <EyeIcon className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Editar" onClick={onEdit} tone={tone}>
        <PencilIcon className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Más" onClick={onMore} tone={tone}>
        <MoreIcon className="h-4 w-4" />
      </IconBtn>
    </>
  );
}
