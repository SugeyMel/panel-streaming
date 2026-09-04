export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#253047] bg-[#0B111C] px-6 py-14 text-center">
      <p className="font-medium text-[#F8FAFC]">{title}</p>
      <p className="mt-2 text-sm text-[#94A3B8]">{description}</p>
    </div>
  );
}
