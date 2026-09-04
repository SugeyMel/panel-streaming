import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#253047] bg-[#070B12]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© 2026 Panel Streaming. Entretenimiento en un solo lugar.</p>
        <div className="flex gap-5">
          <Link href="/pedido" className="hover:text-white">
            Consultar pedido
          </Link>
          <Link href="/login" className="hover:text-white">
            Acceso al panel
          </Link>
        </div>
      </div>
    </footer>
  );
}
