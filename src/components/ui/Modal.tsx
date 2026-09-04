"use client";

import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[#253047] bg-[#111827] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-[#94A3B8] hover:text-white">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-[#94A3B8]">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-2xl border border-[#253047] px-4 py-2 text-sm text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#38BDF8] to-[#06B6D4] px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
