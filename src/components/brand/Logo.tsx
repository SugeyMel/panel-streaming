"use client";

import Link from "next/link";

const LOGO_SRC = "/branding/logo-panel-streaming.png";

export function AppBrand({
  compact = false,
  href = "/",
  role,
  size = "header",
}: {
  compact?: boolean;
  href?: string;
  role?: string;
  size?: "header" | "sidebar";
}) {
  const showRole = Boolean(role) && !compact;

  return (
    <Link
      href={href}
      className={
        showRole
          ? "flex min-w-0 flex-col items-start justify-center gap-1"
          : "inline-flex min-w-0 items-center"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="Panel Streaming"
        className={
          compact
            ? "h-11 w-auto max-w-full object-contain object-left"
            : size === "sidebar"
              ? "h-[52px] w-auto max-w-full object-contain object-left"
              : "h-12 w-auto max-w-full object-contain object-left md:h-[58px] lg:h-16"
        }
        suppressHydrationWarning
      />
      {showRole ? (
        <span className="text-[10px] font-semibold tracking-[0.32em] text-[#38BDF8] uppercase">
          {role}
        </span>
      ) : null}
    </Link>
  );
}

export function Logo(props: {
  compact?: boolean;
  href?: string;
  role?: string;
  size?: "header" | "sidebar";
}) {
  return <AppBrand {...props} />;
}
