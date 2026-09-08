"use client";

import { useEffect, useId, useRef, useState } from "react";
import { whatsappParaGuardar, whatsappParaMostrar } from "@/lib/clientes";

const ERROR_NUEVE = "El WhatsApp debe tener 9 dígitos";

type WhatsAppInputProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (localNine: string) => void;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function WhatsAppInput({
  name,
  defaultValue = "",
  value,
  onValueChange,
  required = false,
  readOnly = false,
  disabled = false,
  id,
  className = "",
}: WhatsAppInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const fieldRef = useRef<HTMLInputElement>(null);
  const [uncontrolled, setUncontrolled] = useState(() => whatsappParaMostrar(value ?? defaultValue));
  const [error, setError] = useState<string | null>(null);
  const local = value !== undefined ? whatsappParaMostrar(value) : uncontrolled;

  function isInvalid(digits: string) {
    return required ? digits.length !== 9 : digits.length > 0 && digits.length !== 9;
  }

  useEffect(() => {
    if (value !== undefined) return;
    const next = whatsappParaMostrar(defaultValue);
    setUncontrolled(next);
    fieldRef.current?.setCustomValidity(isInvalid(next) ? ERROR_NUEVE : "");
  }, [defaultValue, required, value]);

  const stored = local.length === 9 ? whatsappParaGuardar(local) : "";

  function applyRaw(raw: string) {
    const next = whatsappParaMostrar(raw);
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
    const nextInvalid = isInvalid(next);
    fieldRef.current?.setCustomValidity(nextInvalid ? ERROR_NUEVE : "");
    setError(nextInvalid ? ERROR_NUEVE : null);
  }

  return (
    <div className={className}>
      <div
        className={`flex overflow-hidden rounded-xl border bg-[#111827] ${
          error ? "border-[#EF4444]" : "border-[#253047] focus-within:border-[#2563EB]"
        }`}
      >
        <span className="inline-flex shrink-0 items-center border-r border-[#253047] bg-[#0B111C] px-3 text-sm text-[#94A3B8] select-none">
          +51
        </span>
        <input
          ref={fieldRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="987654321"
          value={local}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-[#E2E8F0] outline-none placeholder:text-[#94A3B8] disabled:opacity-70"
          onChange={(event) => applyRaw(event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            applyRaw(event.clipboardData.getData("text"));
          }}
          onBlur={() => {
            if (isInvalid(local)) setError(ERROR_NUEVE);
            else setError(null);
          }}
        />
        {name ? <input type="hidden" name={name} value={stored} /> : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-[#F87171]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
