import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";

export function ScreenHeader({
  title,
  backHref,
  onBack,
  action,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 lg:mb-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#253047] bg-[#111827] text-[#F8FAFC]"
          aria-label="Volver"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      ) : backHref ? (
        <Link
          href={backHref}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#253047] bg-[#111827] text-[#F8FAFC]"
          aria-label="Volver"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
      ) : null}
      <h1 className="flex-1 text-lg font-semibold text-[#F8FAFC]">{title}</h1>
      {action}
    </div>
  );
}
