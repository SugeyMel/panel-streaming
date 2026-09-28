"use client";

import { useState } from "react";
import { CustomerSquareLogo } from "@/components/cliente/CustomerSquareLogo";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CrownIcon,
  KeyIcon,
  MailIcon,
  UserIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { adminWhatsappLink } from "@/lib/admin-contact";
import { platformDisplayName } from "@/lib/platform-logos";
import type { Platform } from "@/lib/types";

/** Planes para que el vendedor dé acceso al gestor de códigos a sus clientes. Se contratan por WhatsApp. */
const PLANES = [
  {
    id: "basico-1m",
    nombre: "Básico · 1 mes",
    precio: "S/ 15",
    detalle: ["Puedes añadir 1 correo tuyo", "Acceso a los correos de las plataformas que adquieras con nosotros"],
    premium: false,
  },
  {
    id: "basico-3m",
    nombre: "Básico · 3 meses",
    precio: "S/ 40",
    detalle: ["Puedes añadir 1 correo tuyo", "Acceso a los correos de las plataformas que adquieras con nosotros"],
    premium: false,
  },
  {
    id: "premium-1m",
    nombre: "Premium · 1 mes",
    precio: "S/ 30",
    detalle: ["Añade hasta 10 correos tuyos", "Gmail, Outlook o de dominio propio"],
    premium: true,
  },
] as const;

export function SellerAccessPromo({
  platforms,
  adminWhatsapp,
}: {
  platforms: Platform[];
  adminWhatsapp?: string;
}) {
  const [open, setOpen] = useState(false);
  const logos = platforms.slice(0, 3);

  function elegir(plan: (typeof PLANES)[number]) {
    if (!adminWhatsapp) return;
    const text = `Hola, quiero el plan "${plan.nombre}" (${plan.precio}) para crear acceso a mis clientes.`;
    window.open(adminWhatsappLink(adminWhatsapp, text), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <section className="relative min-w-0 overflow-hidden rounded-2xl border border-[#7C3AED]/60 bg-[#0B0820] p-5 shadow-[0_0_30px_rgba(124,58,237,0.25)] md:p-7">
        {/* Fondo con brillos */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 90% at 85% 40%, rgba(124,58,237,0.45), transparent 70%), radial-gradient(40% 70% at 100% 100%, rgba(34,211,238,0.25), transparent 70%)",
          }}
        />

        <div className="relative grid items-center gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/70 bg-[#1B1240] px-3 py-1.5 text-xs font-semibold text-white md:text-sm">
              <BoltIcon className="h-4 w-4" />
              Desbloquea nuevas funciones
            </span>
            <h2 className="mt-4 text-2xl leading-tight font-extrabold text-white md:text-4xl">
              Crea acceso a <span className="text-[#A855F7]">tus clientes</span>
            </h2>
            <p className="mt-2 text-sm leading-snug text-[#CBD5E1] md:text-base">
              Sube las plataformas que vendes, añade tus correos y gestiona tu bot de códigos.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] px-5 text-base font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:brightness-110"
            >
              <UserIcon className="h-5 w-5" />
              Crear acceso
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Ilustración: logos de plataformas + íconos del bot */}
          <div aria-hidden className="relative hidden h-44 md:block">
            <div className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8B5CF6]/40" />
            <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#22D3EE]/20" />
            <span className="absolute top-1/2 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-[0_0_25px_rgba(124,58,237,0.6)]">
              <UserIcon className="h-9 w-9" />
            </span>
            {logos.map((platform, index) => (
              <span
                key={platform.id}
                className="absolute"
                style={{ top: ["4%", "10%", "0%"][index], left: ["18%", "48%", "76%"][index] }}
              >
                <CustomerSquareLogo platform={platform} title={platformDisplayName(platform)} size={48} />
              </span>
            ))}
            <span className="absolute bottom-[2%] left-[14%] grid h-12 w-12 place-items-center rounded-xl border border-[#8B5CF6]/60 bg-[#1B1240] text-[#C4B5FD]">
              <MailIcon className="h-6 w-6" />
            </span>
            <span className="absolute bottom-[0%] left-[46%] grid h-12 w-12 place-items-center rounded-xl border border-[#22D3EE]/60 bg-[#0B1F33] text-[#67E8F9]">
              <KeyIcon className="h-6 w-6" />
            </span>
            <span className="absolute bottom-[6%] left-[78%] grid h-12 w-12 place-items-center rounded-xl border border-[#8B5CF6]/60 bg-[#1B1240] text-[#C4B5FD]">
              <BoltIcon className="h-6 w-6" />
            </span>
          </div>
        </div>
      </section>

      <Modal open={open} title="Planes para crear acceso a tus clientes" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-[#94A3B8]">
          Elige un plan y te contactamos por WhatsApp para activarlo.
        </p>
        <div className="space-y-3">
          {PLANES.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => elegir(plan)}
              disabled={!adminWhatsapp}
              className={`block w-full rounded-2xl border p-4 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                plan.premium
                  ? "border-[#F59E0B]/60 bg-gradient-to-br from-[#2A1A05] to-[#111827]"
                  : "border-[#253047] bg-[#0F172A] hover:border-[#8B5CF6]/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  {plan.premium ? <CrownIcon className="h-4 w-4 text-[#F59E0B]" /> : null}
                  {plan.nombre}
                </p>
                <p className={`text-xl font-extrabold ${plan.premium ? "text-[#FBBF24]" : "text-[#A78BFA]"}`}>
                  {plan.precio}
                </p>
              </div>
              <ul className="mt-2 space-y-1">
                {plan.detalle.map((linea) => (
                  <li key={linea} className="flex items-start gap-2 text-[13px] text-[#CBD5E1]">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22D3EE]" />
                    {linea}
                  </li>
                ))}
              </ul>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#4ADE80]">
                <WhatsAppIcon className="h-4 w-4" />
                Contactar por WhatsApp
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
