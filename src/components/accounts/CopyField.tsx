import { CopyIcon } from "@/components/icons";

export function CopyField({
  id,
  value,
  copied,
  onCopy,
}: {
  id: string;
  value: string;
  copied: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className="truncate text-sm text-[#F1F5F9]">{value}</span>
      <button type="button" className="shrink-0 text-[#94A3B8] hover:text-white" aria-label="Copiar" onClick={() => onCopy(id, value)}>
        <CopyIcon className="h-3.5 w-3.5" />
      </button>
      {copied === id ? <span className="text-[10px] text-[#16A34A]">Copiado</span> : null}
    </span>
  );
}
