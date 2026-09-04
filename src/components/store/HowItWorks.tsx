const steps = [
  {
    number: "01",
    title: "Elige tu servicio.",
    text: "Selecciona la plataforma y el plan que mejor se adapte a ti.",
  },
  {
    number: "02",
    title: "Realiza tu pedido.",
    text: "Completa tus datos y genera el pedido en pocos minutos.",
  },
  {
    number: "03",
    title: "Envía tu comprobante.",
    text: "Adjunta el voucher para que el vendedor confirme el pago.",
  },
  {
    number: "04",
    title: "Recibe tu acceso.",
    text: "Cuando el pago esté aprobado, recibirás tu acceso de forma segura.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-comprar" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="text-2xl font-semibold text-white">¿Cómo funciona?</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Un proceso claro, rápido y pensado para que tu pedido llegue sin
        complicaciones.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <article
            key={step.number}
            className="rounded-2xl border border-[#253047] bg-[#111827] p-5"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-[#38BDF8]">
              Paso {step.number}
            </p>
            <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
