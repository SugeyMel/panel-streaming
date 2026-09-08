"use client";

import { useEffect, useRef, useState } from "react";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { Button } from "@/components/ui/Button";
import type { Platform } from "@/lib/types";

export function PlatformLogoField({ platform }: { platform?: Platform | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(platform?.logoUrl ?? null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);

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
  }

  function clearLogo() {
    if (localUrl) URL.revokeObjectURL(localUrl);
    if (inputRef.current) inputRef.current.value = "";
    setLocalUrl(null);
    setPreview(null);
    setRemove(true);
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-400">Logo / imagen de la plataforma</p>
      <p className="text-[11px] leading-snug text-slate-500">
        Medida: <span className="text-slate-300">512×512 px</span> (cuadrado). PNG transparente, sin marco. JPG o WEBP también. Máx. 8 MB.
        En la tienda se muestra al 55% del panel (88 px de alto en celular, 120 px en escritorio).
      </p>
      {preview ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Logo actual</p>
          <div className="flex h-20 w-20 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa del logo" className="max-h-20 max-w-20 object-contain" />
          </div>
        </div>
      ) : platform ? (
        <div className="flex h-20 w-20 items-center justify-center">
          <PlatformLogo platform={platform} size={64} />
        </div>
      ) : (
        <p className="text-xs text-slate-500">Aún no hay imagen.</p>
      )}
      <input
        ref={inputRef}
        name="logo"
        type="file"
        accept="image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => pickFile(event.target.files?.[0])}
      />
      <input type="hidden" name="removeLogo" value={remove ? "1" : "0"} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="h-9 min-h-9 px-3 text-xs" onClick={() => inputRef.current?.click()}>
          {preview ? "Cambiar imagen" : "Subir imagen"}
        </Button>
        {preview ? (
          <Button type="button" variant="ghost" className="h-9 min-h-9 px-3 text-xs" onClick={clearLogo}>
            Eliminar imagen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
