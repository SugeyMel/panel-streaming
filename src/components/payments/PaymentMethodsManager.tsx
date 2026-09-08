"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deletePaymentMethodAction, upsertPaymentMethodAction } from "@/app/actions/business";
import { MoreIcon, PlusIcon } from "@/components/icons";
import { PaymentMethodLogoFields, PaymentMethodLogoSlot } from "@/components/payments/PaymentMethodLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/StatusBadge";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import type { PaymentMethod, SellerPaymentMethod } from "@/lib/types";

const kindLabel = { yape: "Yape", plin: "Plin", bank: "Banco" };

function PaymentMethodForm({
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
    <Card className="p-5">
      <form
        className="grid gap-3 sm:grid-cols-2"
        action={async (formData) => {
          formData.set("sellerId", sellerId);
          if (editing) formData.set("id", editing.id);
          const result = await upsertPaymentMethodAction(formData);
          onResult(result.ok, result.ok ? "Medio de pago guardado." : result.error ?? "No se pudo guardar");
        }}
      >
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as PaymentMethod)}
          className="ui-field"
        >
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
          <option value="bank">Número de cuenta</option>
        </select>
        <input name="holderName" defaultValue={editing?.holderName} placeholder="A nombre de" className="ui-field" />
        <input
          name="accountNumber"
          defaultValue={editing?.accountNumber}
          placeholder="Número Yape / Plin / cuenta"
          className="ui-field sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <PaymentMethodLogoFields existingUrl={editing?.logoUrl} />
        </div>
        {showQr ? (
          <div className="sm:col-span-2 space-y-2">
            <p className="text-sm font-medium text-[#F8FAFC]">Código QR (opcional)</p>
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Vista previa del QR"
                className="h-[160px] w-[160px] max-h-[220px] max-w-[220px] object-contain sm:h-[220px] sm:w-[220px] rounded-xl border border-[#253047] bg-[#0F172A] p-2"
              />
            ) : null}
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#253047] bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC]">
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
            <p className="text-xs text-[#94A3B8]">Medida: 800×800 px (cuadrado). PNG, JPG, JPEG o WEBP. Máx. 2 MB. No se recorta el código.</p>
          </div>
        ) : null}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" className="flex-1">
            {editing ? "Actualizar" : "Añadir medio de pago"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PaymentMethodsManager({
  sellerId,
  methods,
  embedded = false,
}: {
  sellerId: string;
  methods: SellerPaymentMethod[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<SellerPaymentMethod | null>(null);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [showForm, setShowForm] = useState(false);
  const active = methods;
  const visible = tab === "active" ? active : [];

  return (
    <div className="space-y-4">
      {embedded ? (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Medios de pago</h2>
          {methods.length < 5 ? (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full cta-gradient text-white"
              aria-label="Añadir"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : (
        <ScreenHeader
          title="Medios de pago"
          backHref="/panel"
          action={
            methods.length < 5 ? (
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full cta-gradient text-white"
                aria-label="Añadir"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            ) : null
          }
        />
      )}
      <p className="text-sm text-[#94A3B8]">Hasta 5. Yape, Plin o cuenta bancaria, con el nombre al que sale el pago.</p>
      {message ? <p className="text-sm text-[#38BDF8]">{message}</p> : null}

      <div className="flex gap-4 border-b border-[#253047]">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`pb-2 text-sm font-medium ${
            tab === "active" ? "border-b-2 border-[#8B5CF6] text-[#F8FAFC]" : "text-[#94A3B8]"
          }`}
        >
          Activos ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("inactive")}
          className={`pb-2 text-sm font-medium ${
            tab === "inactive" ? "border-b-2 border-[#8B5CF6] text-[#F8FAFC]" : "text-[#94A3B8]"
          }`}
        >
          Inactivos (0)
        </button>
      </div>

      {tab === "inactive" ? (
        <p className="py-8 text-center text-sm text-[#94A3B8]">No hay medios inactivos.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-3">
                <PaymentMethodLogoSlot url={item.logoUrl} className="h-11 w-11 shrink-0 rounded-2xl object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#F8FAFC]">{kindLabel[item.kind]}</p>
                    {index === 0 ? <Badge tone="violet">Principal</Badge> : null}
                    {item.qrPath ? <span className="text-xs font-medium text-[#94A3B8]">QR ✓</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-[#F8FAFC]">{item.accountNumber}</p>
                  <p className="text-sm text-[#94A3B8]">{item.holderName}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-full p-2 text-[#94A3B8]"
                    aria-label="Editar"
                    onClick={() => {
                      setEditing(item);
                      setShowForm(true);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-2 text-[#94A3B8]"
                    aria-label="Quitar"
                    onClick={async () => {
                      const result = await deletePaymentMethodAction(item.id, sellerId);
                      setMessage(result.ok ? "Eliminado." : result.error ?? "No se pudo eliminar");
                    }}
                  >
                    <MoreIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {methods.length === 0 ? <p className="text-sm text-[#94A3B8]">Aún no hay medios de pago.</p> : null}
          {methods.length < 5 ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#253047] bg-[#111827]/50 px-4 py-8 text-sm text-[#94A3B8]"
            >
              <PlusIcon className="h-6 w-6 text-[#8B5CF6]" />
              Añadir nuevo medio de pago
              <span className="text-xs">Máximo 5 medios activos</span>
            </button>
          ) : (
            <p className="text-xs text-[#94A3B8]">Ya tienes 5 medios. Quita uno para añadir otro.</p>
          )}
        </div>
      )}

      {showForm || editing ? (
        <PaymentMethodForm
          key={editing?.id ?? "new"}
          sellerId={sellerId}
          editing={editing}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
          onResult={(ok, text) => {
            setMessage(text);
            if (ok) {
              setEditing(null);
              setShowForm(false);
              router.refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}
