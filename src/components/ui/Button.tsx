"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { tapFeedback } from "@/lib/tap-feedback";

const variants = {
  primary:
    "cta-gradient text-white shadow-[0_8px_20px_rgba(59,130,246,0.18)] hover:brightness-110",
  secondary:
    "border border-[#253047] bg-[#0B111C] text-[#F8FAFC] hover:bg-[#172033]",
  toolbar:
    "!h-10 !min-h-10 gap-2 rounded-lg border border-[#253047] bg-[#111827] px-3 text-sm font-semibold text-[#E2E8F0] hover:bg-[#172033]",
  gradient:
    "!h-10 !min-h-10 gap-2 rounded-lg border-0 bg-gradient-to-r from-blue-600 to-purple-600 px-4 text-sm font-semibold text-white hover:brightness-110",
  ghost: "text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC]",
  danger: "bg-[#EF4444] text-white hover:bg-[#dc2626]",
  success: "bg-[#22C55E] text-white hover:bg-[#16a34a]",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  href?: string;
  busy?: boolean;
  children: ReactNode;
};

function buttonClass(variant: keyof typeof variants, className: string, busy = false) {
  return `btn-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${variants[variant]} ${busy ? "is-busy" : ""} ${className}`;
}

export function Button({
  variant = "primary",
  href,
  className = "",
  children,
  busy = false,
  disabled,
  type,
  onPointerDown,
  ...props
}: ButtonProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={buttonClass(variant, className)}
        onPointerDown={() => tapFeedback(variant !== "ghost")}
      >
        {children}
      </Link>
    );
  }

  return (
    <StatusButton
      variant={variant}
      className={className}
      busy={busy}
      disabled={disabled}
      type={type}
      onPointerDown={onPointerDown}
      {...props}
    >
      {children}
    </StatusButton>
  );
}

function StatusButton({
  variant = "primary",
  className = "",
  children,
  busy = false,
  disabled,
  type,
  onPointerDown,
  ...props
}: ButtonProps) {
  const { pending } = useFormStatus();
  const isActionButton = type !== "button" && type !== "reset";
  const loading = Boolean(busy) || (isActionButton && pending);
  const haptic = variant !== "ghost";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={buttonClass(variant, className, loading)}
      onPointerDown={(event) => {
        if (!disabled && !loading) tapFeedback(haptic);
        onPointerDown?.(event);
      }}
      {...props}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
