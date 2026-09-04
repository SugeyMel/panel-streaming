import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(139,92,246,0.28),transparent_42%),radial-gradient(circle_at_90%_20%,rgba(6,182,212,0.18),transparent_34%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-[#253047] bg-[#0B111C] px-3 py-1 text-xs font-medium tracking-[0.18em] text-[#38BDF8] uppercase">
            Panel Streaming
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-6xl">
            Todo tu entretenimiento en un solo lugar
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#94A3B8] sm:text-lg">
            Encuentra tus plataformas favoritas y realiza tu pedido de forma rápida y sencilla.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/#plataformas" className="min-h-12 px-6">
              Ver plataformas
            </Button>
            <Button href="/pedido" variant="secondary" className="min-h-12 px-6">
              Consultar pedido
            </Button>
          </div>
        </div>
        <div className="hidden rounded-3xl border border-[#253047] bg-[#111827] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:block">
          <p className="text-sm text-[#94A3B8]">Acceso en minutos</p>
          <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">Max, Netflix y más</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#0B111C]">
            <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#38BDF8] to-[#06B6D4]" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[#0B111C] p-3">
              <p className="text-lg font-semibold text-[#F8FAFC]">1</p>
              <p className="text-xs text-[#94A3B8]">Elige</p>
            </div>
            <div className="rounded-2xl bg-[#0B111C] p-3">
              <p className="text-lg font-semibold text-[#F8FAFC]">2</p>
              <p className="text-xs text-[#94A3B8]">Paga</p>
            </div>
            <div className="rounded-2xl bg-[#0B111C] p-3">
              <p className="text-lg font-semibold text-[#F8FAFC]">3</p>
              <p className="text-xs text-[#94A3B8]">Recibe</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
