"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/icons";

export function RegisteredFlash({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => onCloseRef.current(), 1800);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-6"
      role="status"
      aria-live="polite"
      onClick={onClose}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-[#22C55E] shadow-[0_0_48px_rgba(34,197,94,0.5)]">
          <CheckIcon className="h-12 w-12 text-white" />
        </span>
        <p className="text-[1.65rem] font-black tracking-[0.28em] text-white">REGISTRADO</p>
      </div>
    </div>,
    document.body,
  );
}
