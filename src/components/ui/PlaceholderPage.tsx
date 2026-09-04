export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
      </div>
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/3 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">
          Vista preparada para conectar con la base de datos, inventario y
          comprobantes.
        </p>
      </div>
    </section>
  );
}
