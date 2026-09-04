import { SearchIcon } from "@/components/icons";

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative w-full max-w-md">
      <span className="sr-only">{placeholder}</span>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#253047] bg-[#0B111C] py-2.5 pr-4 pl-10 text-sm text-[#F8FAFC] outline-none placeholder:text-[#94A3B8] focus:border-[#38BDF8]/40"
      />
    </label>
  );
}
