import Link from "next/link";

/** Pestañas de "Base de datos": Clientes y Vendedores (excel de cuentas). */
export function BaseDatosTabs({ active }: { active: "clientes" | "vendedores" }) {
  const tabs = [
    { key: "clientes", label: "Clientes", href: "/panel/clientes" },
    { key: "vendedores", label: "Vendedores", href: "/panel/vendedores" },
  ] as const;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold tracking-[0.14em] text-[#64748B] uppercase">Base de datos</span>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
            tab.key === active
              ? "border-[#7C3AED] bg-[#7C3AED] text-white"
              : "border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#7C3AED]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
