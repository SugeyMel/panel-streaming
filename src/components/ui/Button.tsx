import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

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
  children: ReactNode;
};

export function Button({
  variant = "primary",
  href,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
