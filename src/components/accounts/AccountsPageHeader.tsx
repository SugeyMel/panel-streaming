import type { ReactNode } from "react";
import { FilterIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

export function AccountsPageHeader({
  title,
  subtitle,
  onFiltros,
  onAgregar,
  addLabel = "+ Agregar cuenta",
  extraActions,
  tone = "dark",
}: {
  title: string;
  subtitle: string;
  onFiltros: () => void;
  onAgregar: () => void;
  addLabel?: string;
  extraActions?: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className={`text-2xl font-bold ${tone === "light" ? "text-[#0F172A]" : "text-white"}`}>{title}</h1>
        <p className={`mt-1 text-sm ${tone === "light" ? "text-[#64748B]" : "text-[#94A3B8]"}`}>{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {extraActions}
        <Button type="button" variant="toolbar" onClick={onFiltros}>
          <FilterIcon className="h-4 w-4" />
          Filtros avanzados
        </Button>
        <Button type="button" variant="gradient" onClick={onAgregar}>
          {addLabel.startsWith("+") ? addLabel : `+ ${addLabel}`}
        </Button>
      </div>
    </div>
  );
}
