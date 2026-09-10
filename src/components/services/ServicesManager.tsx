"use client";

import { useState } from "react";
import { assignPlatformEmailAction, upsertServiceAction } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ServiceCard } from "@/components/services/ServiceCard";
import { daysRemaining, formatDate } from "@/lib/format";
import { waLink, reminderMessage, confirmRenewalMessage, supportMessage, type PlantillasWhatsapp } from "@/lib/whatsapp";
import type { Customer, Platform, Product, Subscription } from "@/lib/types";

export function ServicesManager({
  services,
  platforms,
  products,
  customers,
  showInternal,
  plantillas = {},
}: {
  services: Subscription[];
  platforms: Platform[];
  products: Product[];
  customers: Customer[];
  showInternal: boolean;
  plantillas?: PlantillasWhatsapp;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Servicios"
        description={showInternal ? "Suscripciones de tus clientes." : "Servicios globales."}
        action={showInternal ? <Button onClick={() => setOpen(true)}>Registrar servicio</Button> : undefined}
      />
      {message ? <p className="mb-4 text-sm text-cyan-300">{message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((subscription) => {
          const platform = platforms.find((item) => item.id === subscription.platformId);
          const customer = customers.find((item) => item.id === subscription.customerId);
          if (!platform) return null;
          return (
            <div key={subscription.id} className="space-y-2">
              <ServiceCard subscription={subscription} platform={platform} showInternal={showInternal} />
              {showInternal ? (
                <form
                  className="flex gap-2"
                  action={async (formData) => {
                    formData.set("serviceId", subscription.id);
                    const result = await assignPlatformEmailAction(formData);
                    setMessage(result.ok ? "Correo de la cuenta guardado." : result.error ?? "No se pudo guardar");
                  }}
                >
                  <input
                    name="platformEmail"
                    type="email"
                    defaultValue={subscription.platformEmail}
                    placeholder="Gmail / correo de esta cuenta"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                  />
                  <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">
                    Guardar correo
                  </Button>
                </form>
              ) : null}
              {customer && showInternal ? (
                <div className="flex flex-wrap gap-3 text-xs">
                  <a
                    className="text-cyan-300"
                    href={waLink(customer.whatsapp, supportMessage(customer.name, platform.name))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Contactar
                  </a>
                  <a
                    className="text-cyan-300"
                    href={waLink(
                      customer.whatsapp,
                      reminderMessage(customer.name, platform.name, formatDate(subscription.endDate), {
                        dias: daysRemaining(subscription.endDate),
                        plantillas,
                      }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Recordar vencimiento
                  </a>
                  <a
                    className="text-cyan-300"
                    href={waLink(
                      customer.whatsapp,
                      confirmRenewalMessage(customer.name, platform.name),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Confirmar renovación
                  </a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <Modal open={open} title="Registrar servicio" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await upsertServiceAction(formData);
            setMessage(result.ok ? "Servicio creado." : result.error ?? "No se pudo crear");
            if (result.ok) setOpen(false);
          }}
        >
          <select name="customerId" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="productId" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.durationDays} días · {item.salePrice}
              </option>
            ))}
          </select>
          <input name="startDate" type="date" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="endDate" type="date" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="costPrice" type="number" step="0.01" placeholder="Costo" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="salePrice" type="number" step="0.01" placeholder="Precio venta" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <input name="platformEmail" type="email" placeholder="Correo de la cuenta (Gmail de Netflix, HBO MAX, etc.)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <select name="status" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <option value="active">Activo</option>
            <option value="expiring">Próximo a vencer</option>
            <option value="expired">Vencido</option>
            <option value="suspended">Suspendido</option>
          </select>
          <textarea name="notes" placeholder="Notas" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" />
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
