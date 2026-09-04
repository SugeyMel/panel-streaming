import { CheckIcon } from "@/components/icons";

const steps = [
  "Pedido recibido",
  "Pago enviado",
  "Pago confirmado",
  "Acceso entregado",
];

export function OrderProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {steps.map((step, index) => {
        const complete = index <= currentStep;
        return (
          <li key={step} className="relative">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                complete
                  ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8]"
                  : "border-[#253047] text-[#94A3B8]"
              }`}
            >
              {complete ? <CheckIcon className="h-4 w-4" /> : index + 1}
            </div>
            <p className="mt-3 text-sm font-medium text-white">{step}</p>
            {index < steps.length - 1 ? (
              <span className="mt-2 hidden text-xs text-slate-500 sm:block">
                Siguiente etapa
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
