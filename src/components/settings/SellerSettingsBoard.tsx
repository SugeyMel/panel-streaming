"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  deletePaymentMethodAction,
  setPaymentMethodActiveAction,
  setPaymentMethodPrimaryAction,
  signOutAction,
  updateSellerSettingsAction,
  uploadSellerLogoAction,
  uploadStoreBannerAction,
  upsertPaymentMethodAction,
} from "@/app/actions/business";
import {
  BellIcon,
  ChatIcon,
  CheckIcon,
  CopyIcon,
  DashboardIcon,
  ExternalLinkIcon,
  HomeIcon,
  LinkIcon,
  LogoutIcon,
  MoreIcon,
  QrIcon,
  ShieldIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { WhatsAppInput } from "@/components/ui/WhatsAppInput";
import { PaymentMethodLogoFields, PaymentMethodLogoSlot } from "@/components/payments/PaymentMethodLogo";
import { MessageTemplatesSection } from "@/components/settings/MessageTemplatesSection";
import { HomeImagesSection } from "@/components/settings/HomeImagesSection";
import type { PaymentMethod, Seller, SellerPaymentMethod } from "@/lib/types";
import type { PlantillasWhatsapp } from "@/lib/whatsapp";
import type { HomeImagesMap } from "@/lib/home-images";

type SectionId = "business" | "payments" | "store" | "messages" | "homeImages" | "notifications" | "security";

const sections: { id: SectionId; label: string; icon: typeof HomeIcon }[] = [
  { id: "business", label: "Mi negocio", icon: HomeIcon },
  { id: "payments", label: "Medios de pago", icon: WalletIcon },
  { id: "store", label: "Tienda", icon: StoreIcon },
  { id: "messages", label: "Mensajes", icon: ChatIcon },
  { id: "homeImages", label: "Imágenes del inicio", icon: DashboardIcon },
  { id: "notifications", label: "Notificaciones", icon: BellIcon },
  { id: "security", label: "Seguridad", icon: ShieldIcon },
];

const kindLabel = { yape: "Yape", plin: "Plin", bank: "Cuenta bancaria" } as const;

export function SellerSettingsBoard({
  seller,
  methods,
  email,
  plantillas,
  homeImages,
}: {
  seller: Seller;
  methods: SellerPaymentMethod[];
  email: string;
  plantillas: PlantillasWhatsapp;
  homeImages: HomeImagesMap;
}) {
  const [section, setSection] = useState<SectionId>("business");
  const [flash, setFlash] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  function onMessage(value: string | null, tone: "ok" | "error" = "ok") {
    if (!value) {
      setFlash(null);
      return;
    }
    setFlash({ text: value, tone });
  }

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-[#F8FAFC]">Configuración</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">Gestiona la información de tu negocio y personaliza tu tienda.</p>
      </div>
      {flash ? (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:bottom-6 lg:left-auto lg:right-8 lg:max-w-md ${
            flash.tone === "ok"
              ? "border-[#22C55E]/50 bg-[#052e16] text-[#86EFAC]"
              : "border-[#EF4444]/50 bg-[#450a0a] text-[#FCA5A5]"
          }`}
        >
          {flash.tone === "ok" ? <CheckIcon className="h-5 w-5 shrink-0 text-[#22C55E]" /> : null}
          {flash.text}
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
              section === item.id ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#253047] text-[#94A3B8]"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav className="hidden w-52 shrink-0 lg:block">
          <div className="space-y-1 rounded-2xl border border-[#253047] bg-[#111827] p-2">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${
                  section === item.id
                    ? "cta-gradient font-semibold text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {section === "business" ? <BusinessSection seller={seller} onMessage={onMessage} /> : null}
          {section === "payments" ? (
            <PaymentsSection sellerId={seller.id} methods={methods} onMessage={onMessage} />
          ) : null}
          {section === "store" ? <StoreSection seller={seller} onMessage={onMessage} /> : null}
          {section === "messages" ? <MessageTemplatesSection plantillas={plantillas} onMessage={onMessage} /> : null}
          {section === "homeImages" ? <HomeImagesSection images={homeImages} onMessage={onMessage} /> : null}
          {section === "notifications" ? <NotificationsSection seller={seller} onMessage={onMessage} /> : null}
          {section === "security" ? <SecuritySection email={email} /> : null}
        </div>
      </div>
    </div>
  );
}

function BusinessSection({ seller, onMessage }: { seller: Seller; onMessage: (value: string | null, tone?: "ok" | "error") => void }) {
  const router = useRouter();
  const path = `/tienda/${seller.slug}`;

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-base font-semibold text-[#F8FAFC]">Mi negocio</h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#253047] bg-[#0B111C]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={seller.logoUrl || "/branding/logo-infinito-mark.png"}
            alt="Logo del negocio"
            className="h-full w-full object-contain p-2"
          />
        </div>
        <form
          className="min-w-0"
          action={async (formData) => {
            const result = await uploadSellerLogoAction(formData);
            onMessage(result.ok ? "Se guardaron tus datos correctamente." : result.error ?? "No se pudo subir", result.ok ? "ok" : "error");
            if (result.ok) router.refresh();
          }}
        >
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-[#253047] bg-[#0B111C] px-3 py-2 text-sm text-[#F8FAFC]">
            Cambiar logo
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              className="sr-only"
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            />
          </label>
          <p className="mt-1 text-[11px] leading-snug text-[#94A3B8]">
            Medida: 512×512 px (cuadrado). PNG o JPG. Máx. 8 MB.
          </p>
        </form>
      </div>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        action={async (formData) => {
          const result = await updateSellerSettingsAction(formData);
          onMessage(
            result.ok ? "Se guardaron tus datos correctamente." : result.error ?? "No se pudo guardar",
            result.ok ? "ok" : "error",
          );
          if (result.ok) router.refresh();
        }}
      >
        <Field label="Nombre del negocio">
          <input name="businessName" defaultValue={seller.businessName} className="ui-field" />
        </Field>
        <Field label="Nombre del vendedor">
          <input name="name" defaultValue={seller.name} className="ui-field" />
        </Field>
        <Field label="WhatsApp de atención">
          <WhatsAppInput name="whatsapp" defaultValue={seller.whatsapp ?? ""} required />
        </Field>
        <Field label="Horario de atención">
          <input
            name="supportHours"
            defaultValue={seller.supportHours}
            placeholder="Lun a Dom · 8:00 am – 11:00 pm"
            maxLength={80}
            className="ui-field"
          />
        </Field>
        <p className="-mt-1 text-[11px] text-[#94A3B8] sm:col-span-2">
          Se muestra debajo del botón de WhatsApp en el panel del cliente.
        </p>
        <Field label="Enlace de mi tienda">
          <CopyField value={path} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full sm:w-auto">
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}

function StoreSection({ seller, onMessage }: { seller: Seller; onMessage: (value: string | null, tone?: "ok" | "error") => void }) {
  const router = useRouter();
  const path = `/tienda/${seller.slug}`;
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-base font-semibold text-[#F8FAFC]">Tienda</h2>
      <div className="mt-4">
        <p className="text-xs text-[#94A3B8]">Imagen de portada</p>
        <div className="mt-2 overflow-hidden rounded-2xl border border-[#253047] bg-[#0B111C]">
          <div
            className="h-28 bg-cover bg-center"
            style={
              seller.storeBannerUrl
                ? { backgroundImage: `url(${seller.storeBannerUrl})` }
                : { background: "linear-gradient(135deg, #1e3a8a 0%, #4c1d95 45%, #0B0F1A 100%)" }
            }
          />
        </div>
        <form
          className="mt-2"
          action={async (formData) => {
            const result = await uploadStoreBannerAction(formData);
            onMessage(result.ok ? "Se guardaron tus datos correctamente." : result.error ?? "No se pudo subir", result.ok ? "ok" : "error");
            if (result.ok) router.refresh();
          }}
        >
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-[#253047] bg-[#0B111C] px-3 py-2 text-sm text-[#F8FAFC]">
            Cambiar banner
            <input
              type="file"
              name="banner"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              className="sr-only"
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            />
          </label>
          <p className="mt-2 text-[11px] leading-snug text-[#94A3B8]">
            Medida: 1920×600 px (horizontal). PNG o JPG. Máx. 8 MB. Se recorta al centro si no calza exacto.
          </p>
        </form>
      </div>
      <form
        className="mt-4 space-y-3"
        action={async (formData) => {
          const result = await updateSellerSettingsAction(formData);
          onMessage(result.ok ? "Se guardaron tus datos correctamente." : result.error ?? "No se pudo guardar", result.ok ? "ok" : "error");
          if (result.ok) router.refresh();
        }}
      >
        <label className="flex items-center gap-2 text-sm text-[#F1F5F9]">
          <input type="hidden" name="storeBannerEnabled" value="false" />
          <input
            type="checkbox"
            name="storeBannerEnabled"
            value="true"
            defaultChecked={seller.storeBannerEnabled !== false}
            className="rounded border-[#253047]"
          />
          Mostrar banner en la tienda
        </label>
        <Field label="Texto pequeño superior">
          <input name="storeBannerKicker" defaultValue={seller.storeBannerKicker} placeholder="ENTRETENIMIENTO SIN LÍMITES" className="ui-field" />
        </Field>
        <Field label="Título principal">
          <input name="storeBannerTitle" defaultValue={seller.storeBannerTitle} placeholder="Tus plataformas favoritas" className="ui-field" />
        </Field>
        <Field label="Frase destacada">
          <input name="storeBannerAccent" defaultValue={seller.storeBannerAccent} placeholder="en un solo lugar" className="ui-field" />
        </Field>
        <Field label="Descripción">
          <textarea
            name="storeBannerDescription"
            defaultValue={seller.storeBannerDescription || seller.storeMessage}
            rows={3}
            placeholder="Series, películas, anime, deportes y más."
            className="ui-field"
          />
        </Field>
        <Field label="Mensaje corto para clientes">
          <textarea name="storeMessage" defaultValue={seller.storeMessage} rows={2} className="ui-field" />
        </Field>
        <Field label="Nombre visible de la tienda">
          <input name="businessName" defaultValue={seller.businessName} className="ui-field" />
        </Field>
        <Field label="Enlace de la tienda">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <CopyField value={path} />
            </div>
            <a
              href={path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#818CF8]"
            >
              Ver tienda
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </Field>
        <Button type="submit" className="w-full sm:w-auto">
          Guardar tienda
        </Button>
      </form>
    </Card>
  );
}

function NotificationsSection({ seller, onMessage }: { seller: Seller; onMessage: (value: string | null, tone?: "ok" | "error") => void }) {
  const router = useRouter();
  const options = [
    { name: "notifyLoginEmail", label: "Correo de inicio", value: seller.notifyLoginEmail },
    { name: "notifyNewOrder", label: "Nuevo pedido", value: seller.notifyNewOrder },
    { name: "notifyPaymentReview", label: "Pago enviado para revisar", value: seller.notifyPaymentReview },
    { name: "notifyServiceExpiring", label: "Servicio próximo a vencer", value: seller.notifyServiceExpiring },
    { name: "notifyInventoryExpiring", label: "Cuenta de inventario próxima a vencer", value: seller.notifyInventoryExpiring },
  ];

  async function save(name: string, next: boolean) {
    const form = new FormData();
    form.set(name, String(next));
    const result = await updateSellerSettingsAction(form);
    onMessage(result.ok ? "Preferencia guardada." : result.error ?? "No se pudo guardar", result.ok ? "ok" : "error");
    if (result.ok) router.refresh();
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-base font-semibold text-[#F8FAFC]">Notificaciones</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((item) => (
          <label key={item.name} className="flex items-center gap-2 text-sm text-[#F8FAFC]">
            <input
              type="checkbox"
              defaultChecked={item.value}
              className="h-4 w-4 rounded border-[#253047]"
              onChange={(event) => save(item.name, event.target.checked)}
            />
            {item.label}
          </label>
        ))}
      </div>
    </Card>
  );
}

function SecuritySection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-base font-semibold text-[#F8FAFC]">Seguridad y cuenta</h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[#94A3B8]">Correo de acceso</p>
          <p className="mt-1 break-all text-sm text-[#F8FAFC]">{email || "—"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            Cambiar contraseña
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="danger" className="w-full border border-[#EF4444] bg-transparent text-[#EF4444] hover:bg-[#EF4444]/10 sm:w-auto">
              <LogoutIcon className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
      {open ? (
        <Modal open title="Cambiar contraseña" onClose={() => setOpen(false)}>
          <form
            className="space-y-3"
            action={async (formData) => {
              const result = await changePasswordAction(formData);
              setMessage(result.ok ? "Contraseña actualizada." : result.error ?? "No se pudo cambiar");
              if (result.ok) setOpen(false);
            }}
          >
            {message ? <p className="text-xs text-[#38BDF8]">{message}</p> : null}
            <input name="password" type="password" placeholder="Nueva clave" className="ui-field" required />
            <input name="confirm" type="password" placeholder="Confirmar clave" className="ui-field" required />
            <Button type="submit" className="w-full">
              Guardar clave
            </Button>
          </form>
        </Modal>
      ) : null}
    </Card>
  );
}

function PaymentsSection({
  sellerId,
  methods,
  onMessage,
}: {
  sellerId: string;
  methods: SellerPaymentMethod[];
  onMessage: (value: string | null, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SellerPaymentMethod | null | "new">(null);
  const [qr, setQr] = useState<SellerPaymentMethod | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F8FAFC]">Medios de pago</h2>
          <p className="text-sm text-[#94A3B8]">Hasta 5. Yape, Plin o cuenta, con QR individual.</p>
        </div>
        {methods.length < 5 ? (
          <Button
            className="w-full sm:w-auto"
            onClick={() => setEditing("new")}
          >
            + Agregar medio de pago
          </Button>
        ) : null}
      </div>
      {methods.length === 0 ? <p className="text-sm text-[#94A3B8]">Aún no hay medios de pago.</p> : null}
      <div className="space-y-2">
        {methods.map((item) => (
          <Card key={item.id} className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <PaymentMethodLogoSlot url={item.logoUrl} />
                <div className="min-w-0">
                  <p className="font-semibold text-[#F8FAFC]">{item.kind === "bank" ? "Cuenta bancaria" : kindLabel[item.kind]}</p>
                  <p className="truncate text-sm text-[#F8FAFC]">{item.accountNumber}</p>
                  <p className="truncate text-xs text-[#94A3B8]">Titular: {item.holderName}</p>
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">
                {item.kind !== "bank" ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-[#253047] px-2.5 py-1.5 text-[11px] text-[#F8FAFC]"
                    onClick={() => setQr(item)}
                  >
                    <QrIcon className="h-3.5 w-3.5" />
                    Ver QR
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    const result = await setPaymentMethodPrimaryAction(item.id, sellerId);
                    onMessage(result.ok ? "Medio principal actualizado." : result.error ?? "No se pudo guardar", result.ok ? "ok" : "error");
                    if (result.ok) router.refresh();
                  }}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    item.isPrimary ? "bg-[#2563EB] text-white" : "border border-[#253047] text-[#94A3B8]"
                  }`}
                >
                  Principal
                </button>
                <label className="inline-flex items-center gap-2 text-[11px] text-[#94A3B8]">
                  <span className="relative inline-flex h-5 w-9 items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={item.isActive}
                      onChange={async (event) => {
                        const result = await setPaymentMethodActiveAction(item.id, sellerId, event.target.checked);
                        onMessage(result.ok ? (event.target.checked ? "Activado." : "Desactivado.") : result.error ?? "No se pudo guardar", result.ok ? "ok" : "error");
                        if (result.ok) router.refresh();
                      }}
                    />
                    <span className="h-5 w-9 rounded-full bg-[#253047] peer-checked:bg-[#22C55E]" />
                    <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </span>
                  {item.isActive ? "Activo" : "Inactivo"}
                </label>
                <button
                  type="button"
                  className="rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#0B111C]"
                  onClick={() => setEditing(item)}
                >
                  Editar
                </button>
                <div className="relative">
                  <button type="button" className="rounded p-1 text-[#94A3B8]" onClick={() => setMenu(menu === item.id ? null : item.id)}>
                    <MoreIcon className="h-4 w-4" />
                  </button>
                  {menu === item.id ? (
                    <div className="absolute right-0 z-20 w-32 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">
                      <button
                        type="button"
                        className="block w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#172033]"
                        onClick={async () => {
                          const result = await deletePaymentMethodAction(item.id, sellerId);
                          onMessage(result.ok ? "Medio eliminado." : result.error ?? "No se pudo eliminar", result.ok ? "ok" : "error");
                          setMenu(null);
                          if (result.ok) router.refresh();
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {editing !== null ? (
        <PaymentForm
          key={editing === "new" ? "new" : editing.id}
          sellerId={sellerId}
          editing={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onResult={(ok, text) => {
            onMessage(text, ok ? "ok" : "error");
            if (ok) {
              setEditing(null);
              router.refresh();
            }
          }}
        />
      ) : null}
      {qr ? (
        <Modal open title={`QR ${kindLabel[qr.kind]}`} onClose={() => setQr(null)}>
          {qr.qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr.qrUrl} alt="Código QR" className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-[#253047] bg-[#0F172A] object-contain p-2" />
          ) : (
            <p className="text-sm text-[#94A3B8]">Esta cuenta aún no tiene QR. Edítala para subirlo.</p>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

function PaymentForm({
  sellerId,
  editing,
  onCancel,
  onResult,
}: {
  sellerId: string;
  editing: SellerPaymentMethod | null;
  onCancel: () => void;
  onResult: (ok: boolean, message: string) => void;
}) {
  const [kind, setKind] = useState<PaymentMethod>(editing?.kind ?? "yape");
  const [preview, setPreview] = useState<string | null>(null);
  const showQr = kind === "yape" || kind === "plin";
  const previewSrc = preview ?? (showQr ? editing?.qrUrl ?? null : null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <Card className="p-4 sm:p-5">
      <form
        className="grid gap-3"
        action={async (formData) => {
          formData.set("sellerId", sellerId);
          if (editing) formData.set("id", editing.id);
          const result = await upsertPaymentMethodAction(formData);
          onResult(result.ok, result.ok ? "Medio de pago guardado." : result.error ?? "No se pudo guardar");
        }}
      >
        <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as PaymentMethod)} className="ui-field">
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
          <option value="bank">Número de cuenta</option>
        </select>
        <input name="holderName" defaultValue={editing?.holderName} placeholder="A nombre de" className="ui-field" />
        <input name="accountNumber" defaultValue={editing?.accountNumber} placeholder="Número Yape / Plin / cuenta" className="ui-field" />
        <PaymentMethodLogoFields existingUrl={editing?.logoUrl} />
        {showQr ? (
          <div className="space-y-2">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="Vista previa del QR" className="h-auto w-full max-w-[220px] object-contain rounded-xl border border-[#253047] bg-[#0F172A] p-2" />
            ) : null}
            <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#253047] bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] sm:w-auto">
              Subir imagen QR
              <input
                type="file"
                name="qr"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(file ? URL.createObjectURL(file) : null);
                }}
              />
            </label>
            <p className="text-[11px] text-[#94A3B8]">Medida: 800×800 px (cuadrado). PNG, JPG o WEBP. Máx. 2 MB.</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="flex-1">
            {editing ? "Actualizar" : "Añadir medio de pago"}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs text-[#94A3B8]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CopyField({ value }: { value: string }) {
  return (
    <span className="relative block min-w-0">
      <LinkIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
      <input readOnly value={value} className="ui-field truncate pr-10 pl-10" />
      <button
        type="button"
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#94A3B8] hover:text-white"
        aria-label="Copiar"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        <CopyIcon className="h-4 w-4" />
      </button>
    </span>
  );
}
