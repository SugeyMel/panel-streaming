"use client";

import { useEffect, useRef, useState } from "react";

export function PaymentMethodLogo({
  url,
  className = "h-8 w-8 shrink-0 rounded-lg object-contain",
}: {
  url?: string | null;
  className?: string;
}) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={className} />
  );
}

export function PaymentMethodLogoSlot({
  url,
  className = "h-11 w-11 shrink-0 rounded-xl object-contain",
}: {
  url?: string | null;
  className?: string;
}) {
  if (url) {
    return <PaymentMethodLogo url={url} className={`${className} bg-[#0F172A] p-1`} />;
  }
  return <span aria-hidden className={`${className} border border-dashed border-[#253047] bg-[#0F172A]`} />;
}

export function PaymentMethodLogoFields({ existingUrl }: { existingUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? (remove ? null : existingUrl ?? null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#F8FAFC]">Logo del medio (opcional)</p>
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="Vista previa del logo" className="h-16 w-16 rounded-xl border border-[#253047] bg-[#0F172A] object-contain p-1" />
      ) : (
        <span className="block h-16 w-16 rounded-xl border border-dashed border-[#253047] bg-[#0F172A]" />
      )}
      <input type="hidden" name="removeLogo" value={remove && !preview ? "true" : "false"} />
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#253047] bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC]">
          {shown ? "Cambiar logo" : "Subir logo"}
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (preview) URL.revokeObjectURL(preview);
              setRemove(false);
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>
        {shown ? (
          <button
            type="button"
            className="rounded-lg border border-[#253047] px-3 py-2 text-sm text-[#94A3B8]"
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setPreview(null);
              setRemove(true);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Quitar logo
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[#94A3B8]">
        Medida: 200×200 px (cuadrado) o 512×512. PNG, JPG o WEBP. Independiente del QR. Máx. 8 MB.
      </p>
    </div>
  );
}
