"use client";

import { useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { restoreMessageTemplateAction, upsertMessageTemplateAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  aplicarVariables,
  AVISO_LARGO_WHATSAPP,
  DEFAULTS_PLANTILLA,
  MAX_CUERPO_WHATSAPP,
  variablesDesconocidas,
  VARIABLES_MENSAJE,
  type PlantillasWhatsapp,
  type TipoPlantillaMensaje,
  type VariablesMensaje,
} from "@/lib/whatsapp";

const CARDS: Array<{ tipo: TipoPlantillaMensaje; title: string; hint: string }> = [
  { tipo: "recordatorio_vencimiento", title: "Recordar vencimiento", hint: "Avisar que el servicio está por vencer." },
  { tipo: "oferta_renovacion", title: "Ofrecer renovación", hint: "Invitar a renovar el servicio." },
  { tipo: "entrega_pedido", title: "Entrega de pedido", hint: "Enviar los datos de acceso al entregar." },
  { tipo: "bienvenida", title: "Bienvenida a un cliente nuevo", hint: "Saludo cuando das de alta a un cliente. Listo para usarse." },
];

const PREVIEW_VIGENTE: VariablesMensaje = {
  nombre: "María Quispe",
  servicio: "Netflix",
  fecha: "26/09/2026",
  dias: 20,
  correo: "maria.quispe@correo.com",
  pin: "1834",
  monto: "S/ 25.00",
};

const PREVIEW_VENCIDO: VariablesMensaje = {
  ...PREVIEW_VIGENTE,
  fecha: "01/09/2026",
  dias: -5,
};

function insertChip(ref: RefObject<HTMLTextAreaElement | null>, value: string, chip: string, setValue: (next: string) => void) {
  const node = ref.current;
  if (!node) {
    setValue(`${value}${chip}`.slice(0, MAX_CUERPO_WHATSAPP));
    return;
  }
  const start = node.selectionStart ?? value.length;
  const end = node.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${chip}${value.slice(end)}`.slice(0, MAX_CUERPO_WHATSAPP);
  setValue(next);
  requestAnimationFrame(() => {
    const pos = start + chip.length;
    node.focus();
    node.setSelectionRange(pos, pos);
  });
}

function unknownWarning(cuerpo: string) {
  const keys = variablesDesconocidas(cuerpo);
  if (keys.length === 0) return null;
  return keys.map((key) => `La variable {${key}} no existe y se enviará tal cual.`).join(" ");
}

export function MessageTemplatesSection({
  plantillas,
  onMessage,
}: {
  plantillas: PlantillasWhatsapp;
  onMessage: (value: string | null, tone?: "ok" | "error") => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#F8FAFC]">Mensajes</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Estos textos se usan al abrir WhatsApp. Si no guardas uno, se envía el mensaje original de la app.
          {" "}
          <strong className="font-medium text-[#CBD5E1]">{`{dias}`}</strong> es negativo cuando la cuenta ya venció.
          Si no escribes un mensaje vencido, se usa el mensaje vigente (o el original, si tampoco hay uno guardado). El tiempo verbal del original se elige solo.
        </p>
      </div>
      {CARDS.map((card) => (
        <TemplateCard key={card.tipo} card={card} saved={plantillas[card.tipo]} onMessage={onMessage} />
      ))}
    </div>
  );
}

function TemplateCard({
  card,
  saved,
  onMessage,
}: {
  card: { tipo: TipoPlantillaMensaje; title: string; hint: string };
  saved?: PlantillasWhatsapp[TipoPlantillaMensaje];
  onMessage: (value: string | null, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const defaults = DEFAULTS_PLANTILLA[card.tipo];
  const vigenteRef = useRef<HTMLTextAreaElement>(null);
  const vencidoRef = useRef<HTMLTextAreaElement>(null);
  const [cuerpo, setCuerpo] = useState(saved?.cuerpo || defaults.vigente);
  const [cuerpoVencido, setCuerpoVencido] = useState(saved?.cuerpoVencido ?? "");
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const warnVigente = unknownWarning(cuerpo);
  const warnVencido = unknownWarning(cuerpoVencido);

  async function save() {
    setBusy(true);
    const form = new FormData();
    form.set("tipo", card.tipo);
    form.set("cuerpo", cuerpo);
    form.set("cuerpoVencido", cuerpoVencido);
    const result = await upsertMessageTemplateAction(form);
    setBusy(false);
    onMessage(
      result.ok ? "Mensaje guardado." : result.error ?? "No se pudo guardar",
      result.ok ? "ok" : "error",
    );
    if (result.ok) router.refresh();
  }

  async function restore() {
    setBusy(true);
    const result = await restoreMessageTemplateAction(card.tipo);
    setBusy(false);
    if (result.ok) {
      setCuerpo(defaults.vigente);
      setCuerpoVencido("");
      setExpiredOpen(false);
      onMessage("Se restauró el mensaje original.", "ok");
      router.refresh();
    } else {
      onMessage(result.error ?? "No se pudo restaurar", "error");
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[#F8FAFC]">{card.title}</h3>
      <p className="mt-0.5 text-xs text-[#94A3B8]">{card.hint}</p>
      <ChipRow onPick={(chip) => insertChip(vigenteRef, cuerpo, chip, setCuerpo)} />
      <textarea
        ref={vigenteRef}
        value={cuerpo}
        maxLength={MAX_CUERPO_WHATSAPP}
        rows={5}
        className="ui-field mt-2 min-h-[7.5rem] resize-y"
        onChange={(event) => setCuerpo(event.target.value.slice(0, MAX_CUERPO_WHATSAPP))}
      />
      <LengthHint length={cuerpo.length} />
      {warnVigente ? <p className="mt-1 text-xs text-[#FBBF24]">{warnVigente}</p> : null}
      <Preview label="Vista previa" text={aplicarVariables(cuerpo, PREVIEW_VIGENTE)} />
      <button
        type="button"
        className="mt-3 text-left text-xs font-medium text-[#818CF8]"
        onClick={() => setExpiredOpen((open) => !open)}
      >
        {expiredOpen ? "Ocultar mensaje vencido" : "Mensaje cuando ya venció (opcional)"}
      </button>
      {expiredOpen ? (
        <div className="mt-2">
          <ChipRow onPick={(chip) => insertChip(vencidoRef, cuerpoVencido, chip, setCuerpoVencido)} />
          <textarea
            ref={vencidoRef}
            value={cuerpoVencido}
            maxLength={MAX_CUERPO_WHATSAPP}
            rows={4}
            placeholder="Vacío = se usa el mensaje de arriba"
            className="ui-field mt-2 min-h-[6rem] resize-y"
            onChange={(event) => setCuerpoVencido(event.target.value.slice(0, MAX_CUERPO_WHATSAPP))}
          />
          <LengthHint length={cuerpoVencido.length} />
          {warnVencido ? <p className="mt-1 text-xs text-[#FBBF24]">{warnVencido}</p> : null}
          {cuerpoVencido.trim() ? (
            <Preview label="Vista previa (ya venció)" text={aplicarVariables(cuerpoVencido, PREVIEW_VENCIDO)} />
          ) : (
            <Preview label="Vista previa (ya venció)" text={aplicarVariables(cuerpo, PREVIEW_VENCIDO)} />
          )}
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="sm:w-auto" disabled={busy} onClick={() => void save()}>
          Guardar
        </Button>
        <Button type="button" variant="secondary" className="sm:w-auto" disabled={busy} onClick={() => void restore()}>
          Restaurar original
        </Button>
      </div>
    </Card>
  );
}

function ChipRow({ onPick }: { onPick: (chip: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {VARIABLES_MENSAJE.map((item) => (
        <button
          key={item.key}
          type="button"
          title={item.hint}
          className="rounded-full border border-[#253047] bg-[#0B111C] px-2.5 py-1 text-[11px] text-[#CBD5E1] hover:border-[#2563EB] hover:text-white"
          onClick={() => onPick(item.chip)}
        >
          {item.chip}
        </button>
      ))}
    </div>
  );
}

function LengthHint({ length }: { length: number }) {
  const warn = length >= AVISO_LARGO_WHATSAPP;
  return (
    <p className={`mt-1 text-[11px] ${warn ? "text-[#FBBF24]" : "text-[#64748B]"}`}>
      {length}/{MAX_CUERPO_WHATSAPP}
      {warn ? " — te estás acercando al límite de WhatsApp." : null}
    </p>
  );
}

function Preview({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2 rounded-xl border border-[#253047] bg-[#0B111C] px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-[#E2E8F0]">{text || "—"}</p>
    </div>
  );
}
