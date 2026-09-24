"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, signInWithoutPasswordAction } from "@/app/actions/business";
import {
  ArrowRightIcon,
  BoltIcon,
  ChartBarsIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tapFeedback } from "@/lib/tap-feedback";

const LOGO = "/branding/logo-infinito-mark.png";

function BrandTitle({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight text-white ${className}`}>
      Panel{" "}
      <span className="bg-gradient-to-r from-[#F472B6] via-[#C084FC] to-[#818CF8] bg-clip-text text-transparent">
        Streaming
      </span>
    </span>
  );
}

function AccessBrand({
  align = "center",
  markClass,
  titleClass,
}: {
  align?: "center" | "left";
  markClass: string;
  titleClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "center" ? "flex-col" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="" className={`shrink-0 object-contain ${markClass}`} suppressHydrationWarning />
      <BrandTitle className={titleClass} />
    </div>
  );
}

function AccessPosterWall() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/login-poster-wall-mobile.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover lg:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/login-poster-wall-desktop.png"
        alt=""
        className="absolute inset-0 hidden h-full w-full object-cover lg:block"
      />
      <div className="absolute inset-0 bg-[#050814]/45 lg:bg-[#050814]/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,8,20,0.2)_10%,rgba(5,8,20,0.62)_62%,#050814_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050814]/75 via-transparent to-[#050814]/88" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.72h5.18c-.22 1.16-1.67 3.4-5.18 3.4-3.12 0-5.66-2.58-5.66-5.76S8.88 5.8 12 5.8c1.78 0 2.97.76 3.65 1.41l2.49-2.4C16.64 3.5 14.5 2.5 12 2.5 6.86 2.5 2.7 6.66 2.7 11.8S6.86 21.1 12 21.1c5.52 0 9.16-3.88 9.16-9.34 0-.63-.07-1.1-.16-1.56H12z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.86c0-2.28 1.86-3.38 1.94-3.43-1.06-1.55-2.7-1.76-3.28-1.78-1.4-.14-2.73.82-3.44.82-.71 0-1.8-.8-2.97-.78-1.53.02-2.94.89-3.72 2.26-1.59 2.75-.41 6.82 1.14 9.05.76 1.09 1.66 2.31 2.84 2.27 1.14-.05 1.57-.74 2.95-.74 1.37 0 1.76.74 2.96.72 1.23-.02 2-1.11 2.75-2.21.87-1.27 1.22-2.5 1.24-2.56-.03-.01-2.38-.91-2.41-3.62zM14.7 6.4c.63-.76 1.05-1.82.93-2.88-.9.04-1.99.6-2.64 1.36-.58.67-1.09 1.75-.95 2.78 1 .08 2.03-.51 2.66-1.26z"
      />
    </svg>
  );
}

export function AccessScreen() {
  const [adminMode, setAdminMode] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = useSearchParams().get("next");
  const live = isSupabaseConfigured();

  return (
    <main className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-[#050814] text-white">
      <AccessPosterWall />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="relative z-20 hidden items-center justify-between px-10 pt-6 lg:flex">
          <AccessBrand align="left" markClass="h-10 w-auto" titleClass="text-lg" />
          <p className="text-sm tracking-[0.22em] text-slate-300">Gestiona · Vende · Crece</p>
        </header>

        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[1fr_minmax(380px,440px)] lg:items-center lg:gap-10 lg:px-10 lg:py-8">
          <section className="mb-6 hidden max-w-xl lg:mb-0 lg:block">
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
              Todo el{" "}
              <span className="bg-gradient-to-r from-[#F472B6] via-[#C084FC] to-[#38BDF8] bg-clip-text text-transparent">
                streaming
              </span>
              <br />
              en un solo lugar
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Administra tus cuentas, controla tus ventas y haz crecer tu negocio de forma fácil y segura.
            </p>
            <ul className="mt-10 space-y-5">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">
                  <ChartBarsIcon className="h-5 w-5" />
                </span>
                <span>
                  <p className="font-semibold text-sky-200">Gestiona</p>
                  <p className="text-sm text-slate-400">Tus plataformas y clientes</p>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-fuchsia-300">
                  <BoltIcon className="h-5 w-5" />
                </span>
                <span>
                  <p className="font-semibold text-fuchsia-200">Vende</p>
                  <p className="text-sm text-slate-400">Más rápido y organizado</p>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-300">
                  <ShieldIcon className="h-5 w-5" />
                </span>
                <span>
                  <p className="font-semibold text-emerald-200">Crece</p>
                  <p className="text-sm text-slate-400">Con herramientas seguras</p>
                </span>
              </li>
            </ul>
            <p className="mt-16 text-[11px] tracking-[0.38em] text-slate-500 uppercase">
              Panel Streaming
            </p>
            <p className="mt-2 text-[11px] tracking-[0.22em] text-slate-500 uppercase">
              Más que plataformas, oportunidades
            </p>
          </section>

          <div className="mx-auto w-full max-w-[420px] lg:mx-0 lg:justify-self-end">
            <div className="mb-3 flex flex-col items-center lg:hidden">
              <AccessBrand markClass="h-14 w-auto" titleClass="text-[26px]" />
              <p className="mt-2 text-[11px] tracking-[0.28em] text-slate-400 uppercase">
                Gestiona · Vende · Crece
              </p>
            </div>

            <div
              id="access-card"
              className="rounded-[28px] border border-white/10 bg-[#0B1220]/94 p-4 shadow-[0_0_80px_rgba(56,189,248,0.12),0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-7"
            >
              <div className="mb-5 hidden flex-col items-center lg:flex">
                <AccessBrand markClass="h-14 w-auto" titleClass="text-2xl" />
                <p className="mt-2 text-[11px] tracking-[0.28em] text-slate-400 uppercase">
                  Inicia sesión en tu panel
                </p>
              </div>

              <div className="mb-4 text-center lg:hidden">
                <h2 className="text-xl font-semibold">Bienvenido de nuevo</h2>
                <p className="mt-1 text-sm text-slate-400">Inicia sesión para acceder a tu panel</p>
              </div>

              <form
                className="space-y-3 sm:space-y-4"
                onSubmit={() => {
                  tapFeedback();
                  setPending(true);
                  setError(null);
                  setHint(null);
                }}
                action={async (formData) => {
                  setPending(true);
                  setError(null);
                  setHint(null);
                  const result = adminMode
                    ? await signInAction(formData)
                    : await signInWithoutPasswordAction(formData);
                  if (result && "error" in result && result.error) {
                    setError(result.error);
                    setPending(false);
                  }
                }}
              >
                {next ? <input type="hidden" name="next" value={next} /> : null}

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-200">Correo o celular</span>
                  <span className="relative block">
                    <MailIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      name="identifier"
                      required
                      autoComplete="username"
                      placeholder="tu@email.com o 987654321"
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#070B14] pr-3 pl-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50 sm:h-12"
                    />
                  </span>
                </label>

                {adminMode ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-200">Contraseña</span>
                      <span className="relative block">
                        <LockIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          required
                          autoComplete="current-password"
                          placeholder="Ingresa tu contraseña"
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#070B14] pr-11 pl-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50 sm:h-12"
                        />
                        <button
                          type="button"
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </span>
                    </label>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(event) => setRemember(event.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#7C5CFF]"
                        />
                        Recordarme
                      </label>
                      <button
                        type="button"
                        className="text-sky-300 hover:text-sky-200"
                        onClick={() =>
                          setHint("Pide a tu vendedor o al administrador que restablezca tu clave.")
                        }
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    Escribe solo tu correo o celular, sin clave.
                  </p>
                )}

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}
                {hint ? <p className="text-sm text-sky-200">{hint}</p> : null}

                <button
                  type="submit"
                  disabled={pending}
                  aria-busy={pending}
                  onPointerDown={() => {
                    if (!pending) tapFeedback();
                  }}
                  className={`btn-press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#A855F7] via-[#6366F1] to-[#22D3EE] text-sm font-semibold text-white shadow-[0_10px_28px_rgba(99,102,241,0.35)] hover:brightness-110 disabled:opacity-70 sm:h-12 ${pending ? "is-busy" : ""}`}
                >
                  {pending ? <span className="btn-spinner" aria-hidden="true" /> : null}
                  {pending ? "Ingresando..." : adminMode ? "Iniciar sesión" : "Ingresar"}
                  {pending ? null : <ArrowRightIcon className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-4 text-center sm:mt-5">
                <p className="text-xs text-slate-400">
                  {adminMode ? "¿Eres cliente o vendedor?" : "¿Tienes acceso administrativo?"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAdminMode((value) => !value);
                    setError(null);
                    setHint(null);
                  }}
                  className="btn-press mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#070B14] px-5 text-sm font-semibold text-white hover:bg-white/5"
                >
                  <UserIcon className="h-4 w-4" />
                  {adminMode ? "Ingresar sin clave" : "Acceso administrador"}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 text-[11px] tracking-[0.18em] text-slate-500 uppercase sm:mt-5">
                <span className="h-px flex-1 bg-white/10" />
                o continúa con
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
                <button
                  type="button"
                  className="btn-press flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#070B14] text-sm font-medium text-white hover:bg-white/5 sm:h-12"
                  onPointerDown={() => tapFeedback()}
                  onClick={() => setError("El acceso con Google y Apple estará disponible pronto.")}
                >
                  <GoogleMark />
                  Google
                </button>
                <button
                  type="button"
                  className="btn-press flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#070B14] text-sm font-medium text-white hover:bg-white/5 sm:h-12"
                  onPointerDown={() => tapFeedback()}
                  onClick={() => setError("El acceso con Google y Apple estará disponible pronto.")}
                >
                  <AppleMark />
                  Apple
                </button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-3 py-2.5 text-center sm:mt-5 sm:py-3">
                <ShieldIcon className="h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-medium text-emerald-100">Acceso seguro y protegido</p>
                  <p className="text-[11px] text-slate-400">Tus datos están cifrados</p>
                </div>
              </div>

              {!live ? (
                <p className="mt-3 text-center text-[11px] text-slate-500">
                  Modo demo: usa un correo con “admin” para el panel de administrador, “cliente” o un celular para el de cliente, y cualquier otro para vendedor.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-auto px-4 pt-3 pb-4 lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2 text-center">
            <div>
              <ChartBarsIcon className="mx-auto h-5 w-5 text-sky-300" />
              <p className="mt-1 text-xs font-semibold text-sky-200">Gestiona</p>
              <p className="text-[10px] text-slate-500">Tus plataformas</p>
            </div>
            <div>
              <BoltIcon className="mx-auto h-5 w-5 text-fuchsia-300" />
              <p className="mt-1 text-xs font-semibold text-fuchsia-200">Vende</p>
              <p className="text-[10px] text-slate-500">Más rápido</p>
            </div>
            <div>
              <UserIcon className="mx-auto h-5 w-5 text-pink-300" />
              <p className="mt-1 text-xs font-semibold text-pink-200">Crece</p>
              <p className="text-[10px] text-slate-500">Tu negocio</p>
            </div>
            <div>
              <ShieldIcon className="mx-auto h-5 w-5 text-emerald-300" />
              <p className="mt-1 text-xs font-semibold text-emerald-200">Seguro</p>
              <p className="text-[10px] text-slate-500">Siempre</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] tracking-[0.28em] text-slate-500 uppercase">
            Más que plataformas, oportunidades
          </p>
        </div>
      </div>
    </main>
  );
}
