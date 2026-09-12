"use client";

import Link from "next/link";

const INFINITY_SRC = "/branding/logo-infinito-mark.png";

export function AppBrand({
  compact = false,
  href = "/",
  role,
  size = "header",
  logoSrc,
  title,
  tone = "dark",
}: {
  compact?: boolean;
  href?: string;
  role?: string;
  size?: "header" | "sidebar";
  logoSrc?: string | null;
  title?: string;
  tone?: "dark" | "light";
}) {
  const showRole = Boolean(role) && !compact;
  const mark = logoSrc || INFINITY_SRC;
  const name = title?.trim() || "Panel Streaming";
  const markClass = logoSrc
    ? compact
      ? "h-9 w-9 rounded-lg sm:h-10 sm:w-10"
      : size === "sidebar"
        ? "h-11 w-11 rounded-xl"
        : "h-11 w-11 rounded-xl md:h-12 md:w-12"
    : compact
      ? "h-9 w-auto sm:h-10"
      : size === "sidebar"
        ? "h-11 w-auto"
        : "h-11 w-auto md:h-12";
  const titleClass = compact
    ? `text-[15px] font-bold tracking-tight sm:text-base ${tone === "light" ? "text-[#0F172A]" : "text-white"}`
    : size === "sidebar"
      ? `text-lg font-bold tracking-tight ${tone === "light" ? "text-[#0F172A]" : "text-white"}`
      : `text-base font-bold tracking-tight md:text-lg ${tone === "light" ? "text-[#0F172A]" : "text-white"}`;

  return (
    <Link
      href={href}
      className={
        showRole
          ? "flex min-w-0 items-center"
          : "inline-flex min-w-0 items-center"
      }
    >
      <span
        className={`inline-flex min-w-0 items-center ${
          size === "sidebar" && !compact ? "gap-[11px]" : "gap-4"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mark}
          alt=""
          className={`shrink-0 object-contain object-left ${logoSrc ? "" : "-translate-y-[17%]"} ${markClass}`}
          suppressHydrationWarning
        />
        <span className={`min-w-0 truncate ${titleClass}`}>{name}</span>
        {showRole ? (
          <span className="ml-1 shrink-0 rounded-full border border-[#253047] bg-[#172033] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#C4B5FD] uppercase">
            {role}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function Logo(props: {
  compact?: boolean;
  href?: string;
  role?: string;
  size?: "header" | "sidebar";
  logoSrc?: string | null;
  title?: string;
}) {
  return <AppBrand {...props} />;
}
