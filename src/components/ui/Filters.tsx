export function Filters<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-[#F8FAFC] text-[#070B12]"
                : "border border-[#253047] bg-[#0B111C] text-[#94A3B8] hover:bg-[#172033]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
