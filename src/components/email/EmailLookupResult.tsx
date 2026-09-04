import { Card } from "@/components/ui/Card";
import type { EmailLookupResult } from "@/lib/types";

export function EmailLookupResultCard({ result }: { result: EmailLookupResult }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-cyan-300">Resultado seguro</p>
      <p className="mt-2 text-lg font-semibold text-white">{result.message}</p>
      {result.code ? (
        <p className="mt-4 text-4xl font-semibold tracking-[0.2em] text-white">{result.code}</p>
      ) : null}
      {result.safeActionAvailable ? (
        <p className="mt-3 text-sm text-slate-300">Acción autorizada disponible.</p>
      ) : null}
      <p className="mt-4 text-xs text-slate-500">
        No se muestra el correo completo ni el contenido del mensaje.
      </p>
    </Card>
  );
}
