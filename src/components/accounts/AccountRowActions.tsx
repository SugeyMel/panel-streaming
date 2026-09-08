"use client";

import type { ReactNode } from "react";
import { EyeIcon, MoreIcon, PencilIcon } from "@/components/icons";
import { WhatsAppMenu } from "@/components/accounts/WhatsAppMenu";
import type { DestinoWhatsapp, PlantillasWhatsapp } from "@/lib/whatsapp";

export { WhatsAppMenu } from "@/components/accounts/WhatsAppMenu";

const actionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded text-[#94A3B8] hover:text-white";

export function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={actionBtnClass} aria-label={label} title={label} onClick={onClick}>
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
}: {
  whatsapp?: DestinoWhatsapp | null;
  plantillas?: PlantillasWhatsapp;
  onView: () => void;
  onEdit: () => void;
  onMore: () => void;
}) {
  return (
    <>
      <WhatsAppMenu destino={whatsapp ?? null} plantillas={plantillas} />
      <IconBtn label="Ver" onClick={onView}>
        <EyeIcon className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Editar" onClick={onEdit}>
        <PencilIcon className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Más" onClick={onMore}>
        <MoreIcon className="h-4 w-4" />
      </IconBtn>
    </>
  );
}
