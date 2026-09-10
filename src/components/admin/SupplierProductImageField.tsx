"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export function SupplierProductImageField({
  imageUrl,
  autoSubmit = false,
  onFile,
  includeFileName = true,
}: {
  imageUrl?: string | null;
  autoSubmit?: boolean;
  onFile?: (file: File | null) => void;
  includeFileName?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(imageUrl ?? null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    setPreview(imageUrl ?? null);
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (localUrl) URL.revokeObjectURL(localUrl);
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    setPreview(url);
    setRemove(false);
    onFile?.(file);
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-slate-400">Imagen del producto</p>
        <p className="text-[11px] text-slate-500">Medida: 400×400 px (cuadrado) o 720×480. PNG, JPG o WEBP. Máx. 8 MB.</p>
      </div>
      {preview ? (
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-[#0B111C]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Vista previa de la imagen del producto"
            className="h-full w-full object-cover"
            onError={() => {
              if (!localUrl) setPreview(null);
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500">Aún no hay imagen.</p>
      )}
      <input
        ref={inputRef}
        {...(includeFileName ? { name: "image" } : {})}
        type="file"
        accept="image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg"
        className="sr-only"
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          if (autoSubmit) event.currentTarget.form?.requestSubmit();
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="h-9 min-h-9 px-3 text-xs" onClick={() => inputRef.current?.click()}>
          {preview ? "Cambiar imagen" : "Subir imagen"}
        </Button>
        {preview ? (
          autoSubmit ? (
            <Button type="submit" name="removeImage" value="1" variant="ghost" className="h-9 min-h-9 px-3 text-xs">
              Quitar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-9 min-h-9 px-3 text-xs"
              onClick={() => {
                if (localUrl) URL.revokeObjectURL(localUrl);
                if (inputRef.current) inputRef.current.value = "";
                setLocalUrl(null);
                setPreview(null);
                setRemove(true);
                onFile?.(null);
              }}
            >
              Quitar
            </Button>
          )
        ) : null}
      </div>
      {!autoSubmit ? <input type="hidden" name="removeImage" value={remove ? "1" : "0"} /> : null}
    </div>
  );
}
