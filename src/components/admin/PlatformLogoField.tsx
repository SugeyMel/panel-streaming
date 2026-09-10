"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ImageWithDominantFill } from "@/components/media/ImageWithDominantFill";
import { platformLogoSrc } from "@/lib/platform-logos";
import type { Platform } from "@/lib/types";

export function PlatformLogoField({
  platform,
  kind = "tienda",
}: {
  platform?: Platform | null;
  kind?: "tienda" | "clientes";
}) {
  const isClientes = kind === "clientes";
  const existing = isClientes ? platform?.customerLogoUrl ?? null : platform?.logoUrl ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existing);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const shown = preview || (remove || isClientes ? null : platformLogoSrc(platform));

  useEffect(() => {
    setPreview(existing);
    setRemove(false);
  }, [existing, platform?.id]);

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
      <p className="text-xs text-slate-400">
        {isClientes ? "Logo cuadrado (Clientes)" : "Logo / imagen de la plataforma"}
      </p>
      <p className="text-[11px] leading-snug text-slate-500">
        {isClientes ? (
          <>
            Medida: <span className="text-slate-300">400×400 px</span> (cuadrado). PNG, JPG o WEBP. Máx. 8 MB.
            Solo se usa en el Inicio del cliente. No reemplaza el logo de tienda ni la foto de mayorista.
          </>
        ) : (
          <>
            Medida: <span className="text-slate-300">720×480 px</span> (horizontal). PNG, JPG o WEBP. Máx. 8 MB.
            En la tienda llena todo el recuadro superior de la tarjeta (72 px de alto en celular, 96 px en escritorio).
          </>
        )}
      </p>
      {shown ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{isClientes ? "Vista previa (cuadrado)" : "Así se ve en la tarjeta"}</p>
          {isClientes ? (
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-[#0D1320] ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown} alt="Vista previa del logo de clientes" className="h-full w-full object-contain p-1" />
            </div>
          ) : (
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl ring-1 ring-white/10">
              <ImageWithDominantFill
                src={shown}
                alt="Vista previa del logo"
                fallback={platform?.accentFrom || "#0D1320"}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Aún no hay imagen.</p>
      )}
      <input
        ref={inputRef}
        name={isClientes ? "customerLogo" : "logo"}
        type="file"
        accept="image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => pickFile(event.target.files?.[0])}
      />
      <input type="hidden" name={isClientes ? "removeCustomerLogo" : "removeLogo"} value={remove ? "1" : "0"} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="h-9 min-h-9 px-3 text-xs" onClick={() => inputRef.current?.click()}>
          {shown ? "Cambiar imagen" : "Subir imagen"}
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
