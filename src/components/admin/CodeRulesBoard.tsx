"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { savePlatformCodeRuleAction } from "@/app/actions/code-settings";
import type { PlatformCodeRule } from "@/lib/code-settings";

type PlatformItem = { id: string; name: string; slug: string };
type RuleKey = "login" | "verification" | "travel" | "household";

/** Opciones que aplican a cada plataforma (solo se muestran las que tienen sentido). */
function optionsFor(slug: string): { key: RuleKey; title: string; hint: string; warn?: boolean }[] {
  const s = slug.toLowerCase();
  if (s.includes("netflix")) {
    return [
      { key: "login", title: "Código de inicio de sesión (4 dígitos)", hint: "“Netflix: Tu código de inicio de sesión”." },
      {
        key: "verification",
        title: "Código de verificación (6 dígitos)",
        hint: "“Alguien intenta acceder a tu cuenta”. Es para entrar desde un navegador web.",
        warn: true,
      },
      {
        key: "travel",
        title: "Estoy de viaje / acceso temporal",
        hint: "Muestra el botón rojo “Obtener código en Netflix”.",
      },
      {
        key: "household",
        title: "Actualizar hogar",
        hint: "Muestra el botón “Actualizar hogar en Netflix”. Cambia la ubicación de la cuenta.",
        warn: true,
      },
    ];
  }
  if (s.includes("disney")) {
    return [
      { key: "login", title: "Código de inicio de sesión", hint: "Código único que pide Disney+ para entrar." },
      { key: "verification", title: "Código de verificación", hint: "Verificación enviada por Disney+." },
      {
        key: "household",
        title: "Actualizar Hogar de Disney+",
        hint: "Código del correo “¿Vas a actualizar tu Hogar de Disney+?”.",
        warn: true,
      },
    ];
  }
  return [
    { key: "login", title: "Código de inicio de sesión", hint: "Código que pide la plataforma para entrar." },
    { key: "verification", title: "Código de verificación", hint: "Verificación enviada por la plataforma." },
  ];
}

function Switch({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${on ? "bg-emerald-500" : "bg-[#334155]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function sameRule(a: PlatformCodeRule, b: PlatformCodeRule) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Administrador → Correos → Reglas de códigos: todo lo de cada plataforma en un solo lugar
 * (códigos activos, tipos de correo permitidos y palabras bloqueadas).
 */
export function CodeRulesBoard({
  platforms,
  rules,
  savedIds,
  globalWords,
}: {
  platforms: PlatformItem[];
  /** Regla efectiva de cada plataforma (id → regla). */
  rules: Record<string, PlatformCodeRule>;
  /** Plataformas que ya tienen su propia regla guardada. */
  savedIds: string[];
  /** Palabras bloqueadas generales de antes (se pasan a Netflix al guardarla por primera vez). */
  globalWords: string[];
}) {
  const router = useRouter();
  const netflix = platforms.find((item) => item.slug.toLowerCase().includes("netflix"));
  const migrateWords = Boolean(netflix && globalWords.length && !savedIds.includes(netflix.id));

  // Estado inicial: si Netflix aún no tiene regla, trae tus palabras de antes.
  const initial = useMemo(() => {
    const out: Record<string, PlatformCodeRule> = {};
    for (const platform of platforms) {
      const rule = rules[platform.id];
      out[platform.id] =
        migrateWords && platform.id === netflix?.id
          ? { ...rule, blockWords: [...new Set([...rule.blockWords, ...globalWords])] }
          : rule;
    }
    return out;
  }, [platforms, rules, migrateWords, netflix?.id, globalWords]);

  const [draft, setDraft] = useState<Record<string, PlatformCodeRule>>(initial);
  const [selectedId, setSelectedId] = useState(netflix?.id ?? platforms[0]?.id ?? "");
  const [newWord, setNewWord] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const platform = platforms.find((item) => item.id === selectedId);
  const rule = platform ? draft[platform.id] : null;
  const dirty = Boolean(platform && rule && !sameRule(rule, rules[platform.id]));

  function update(patch: Partial<PlatformCodeRule>) {
    if (!platform) return;
    setDraft((current) => ({ ...current, [platform.id]: { ...current[platform.id], ...patch } }));
    setStatus(null);
  }

  function addWord() {
    const value = newWord.trim();
    if (!value || !rule) return;
    if (!rule.blockWords.some((item) => item.toLowerCase() === value.toLowerCase())) {
      update({ blockWords: [...rule.blockWords, value] });
    }
    setNewWord("");
  }

  async function save() {
    if (!platform || !rule || pending) return;
    setPending(true);
    setStatus(null);
    try {
      const result = await savePlatformCodeRuleAction(platform.id, rule, {
        clearGlobalWords: migrateWords && platform.id === netflix?.id,
      });
      setStatus(
        result.ok
          ? { ok: true, text: `✓ Reglas de ${platform.name} guardadas.` }
          : { ok: false, text: result.error ?? "No se pudo guardar." },
      );
      if (result.ok) router.refresh();
    } catch {
      setStatus({ ok: false, text: "No se pudo guardar. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  if (!platform || !rule) return null;
  const options = optionsFor(platform.slug || platform.name);

  return (
    <section id="code-rules" className="mb-3 rounded-2xl border border-[#253047] bg-[#111827] p-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Reglas de códigos</h2>
        <p className="text-[11px] text-[#64748B]">
          Elige una plataforma y decide qué correos pueden ver tus vendedores y clientes.
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {platforms.map((item) => {
          const active = draft[item.id]?.enabled !== false;
          const selected = item.id === platform.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setStatus(null);
                setNewWord("");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? "border-violet-400/70 bg-violet-500/20 text-white"
                  : "border-[#253047] bg-[#0B111C] text-[#CBD5E1] hover:border-violet-400/40"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-[#1e293b] bg-[#0B111C] p-3">
        <div className="flex items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
          <div>
            <p className="text-sm font-semibold text-white">{platform.name}</p>
            <p className={`text-[11px] ${rule.enabled ? "text-emerald-300" : "text-red-300"}`}>
              {rule.enabled ? "Códigos activos" : "Pausado: no se entrega ningún código de esta plataforma"}
            </p>
          </div>
          <Switch on={rule.enabled} onClick={() => update({ enabled: !rule.enabled })} label={`Códigos de ${platform.name}`} />
        </div>

        <div className={`mt-2 space-y-1.5 ${rule.enabled ? "" : "pointer-events-none opacity-40"}`}>
          {options.map((option) => {
            const on = rule[option.key];
            return (
              <div key={option.key} className="flex items-center gap-2 rounded-lg border border-[#1e293b] px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white">
                    {option.title}
                    {option.warn ? <span className="ml-1 text-[10px] text-amber-300">⚠</span> : null}
                  </p>
                  <p className="text-[10px] leading-tight text-[#64748B]">{option.hint}</p>
                </div>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    on ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {on ? "Permitido" : "Bloqueado"}
                </span>
                <Switch
                  on={on}
                  disabled={!rule.enabled}
                  onClick={() => update({ [option.key]: !on } as Partial<PlatformCodeRule>)}
                  label={option.title}
                />
              </div>
            );
          })}

          <div className="rounded-lg border border-[#1e293b] px-2.5 py-2">
            <p className="text-xs font-medium text-white">Palabras bloqueadas</p>
            <p className="text-[10px] leading-tight text-[#64748B]">
              Si el asunto o el inicio del correo tiene una de estas palabras, no se muestra (solo en {platform.name}).
            </p>
            {migrateWords && platform.id === netflix?.id ? (
              <p className="mt-1 text-[10px] text-amber-300">
                Trajimos aquí tus palabras de antes. Pulsa “Guardar” para dejarlas solo en Netflix.
              </p>
            ) : null}
            {rule.blockWords.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {rule.blockWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 py-0.5 pr-1 pl-2 text-[11px] text-red-100"
                  >
                    <span className="truncate">🔒 {word}</span>
                    <button
                      type="button"
                      onClick={() => update({ blockWords: rule.blockWords.filter((item) => item !== word) })}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-red-200 hover:bg-red-500/30"
                      aria-label={`Quitar ${word}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-[#64748B]">Sin palabras bloqueadas.</p>
            )}
            <div className="mt-1.5 flex gap-1.5">
              <input
                value={newWord}
                onChange={(event) => setNewWord(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addWord();
                  }
                }}
                placeholder="Escribe una palabra o frase"
                className="h-8 min-w-0 flex-1 rounded-lg border border-[#253047] bg-[#070B14] px-2.5 text-xs text-white outline-none placeholder:text-[#64748B] focus:border-violet-400/50"
              />
              <button
                type="button"
                onClick={addWord}
                disabled={!newWord.trim()}
                className="h-8 shrink-0 rounded-lg border border-[#253047] bg-[#1B2436] px-3 text-xs font-semibold text-white hover:border-violet-400/50 disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-2">
          <span className="text-xs">🔒</span>
          <p className="text-[10px] leading-tight text-[#94A3B8]">
            <span className="font-semibold text-red-200">Protección automática en todas las plataformas: </span>
            cambio de correo, contraseña, 2FA, pagos y avisos de Gmail/Outlook nunca se muestran.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || (!dirty && !(migrateWords && platform.id === netflix?.id))}
            className="h-9 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Guardando..." : `Guardar ${platform.name}`}
          </button>
          {dirty ? <span className="text-[11px] text-amber-300">Tienes cambios sin guardar</span> : null}
          {status ? (
            <span className={`text-[11px] font-medium ${status.ok ? "text-emerald-300" : "text-red-300"}`}>{status.text}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
