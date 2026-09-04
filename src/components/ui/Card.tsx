import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[16px] border border-[#253047] bg-[#111827] shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#253047] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-[#F8FAFC]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[#94A3B8]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
