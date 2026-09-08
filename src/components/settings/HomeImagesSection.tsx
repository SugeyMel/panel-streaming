"use client";

import { useRouter } from "next/navigation";
import {
  CreditCardIcon,
  InventoryIcon,
  MailIcon,
  OrdersIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StoreIcon,
  UsersIcon,
} from "@/components/icons";
import { HomeSlotImage } from "@/components/panel/HomeSlotImage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { removeHomeImageAction, uploadHomeImageAction } from "@/app/actions/business";
import { HOME_IMAGE_SLOTS, HOME_SLOT_META, type HomeImageSlot, type HomeImagesMap } from "@/lib/home-images";
import type { ComponentType, SVGProps } from "react";

const SLOT_ICONS: Record<HomeImageSlot, ComponentType<SVGProps<SVGSVGElement>>> = {
  hero: StoreIcon,
  tienda: ShoppingBagIcon,
  clientes: UsersIcon,
  correos: MailIcon,
  inventario: InventoryIcon,
  pagos: CreditCardIcon,
  pedidos: OrdersIcon,
  reportes: UsersIcon,
  configuracion: SettingsIcon,
};

export function HomeImagesSection({
  images,
  onMessage,
}: {
  images: HomeImagesMap;
  onMessage: (value: string | null, tone?: "ok" | "error") => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#F8FAFC]">Imágenes del inicio</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Una imagen por espacio. La misma foto se usa en celular y escritorio. PNG, JPG o WEBP. Máx. 8 MB. Si no subes nada, el inicio muestra el degradado con icono.
        </p>
      </div>
      {HOME_IMAGE_SLOTS.map((slot) => (
        <SlotCard key={slot} slot={slot} url={images[slot]?.url} onMessage={onMessage} />
      ))}
    </div>
  );
}

function SlotCard({
  slot,
  url,
  onMessage,
}: {
  slot: HomeImageSlot;
  url?: string;
  onMessage: (value: string | null, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const meta = HOME_SLOT_META[slot];
  const Icon = SLOT_ICONS[slot];
  const isHero = slot === "hero";

  async function remove() {
    const result = await removeHomeImageAction(slot);
    onMessage(result.ok ? "Imagen quitada." : result.error ?? "No se pudo quitar", result.ok ? "ok" : "error");
    if (result.ok) router.refresh();
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">{meta.label}</h3>
        <p className="text-[11px] text-[#94A3B8]">{meta.recommended}</p>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">Miniatura</p>
          <HomeSlotImage
            slot={slot}
            url={url}
            alt={meta.label}
            sizes="(max-width: 1024px) 100vw, 320px"
            icon={<Icon className="h-8 w-8" />}
            className={isHero ? "h-24 w-full rounded-xl" : "h-36 w-full rounded-xl"}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">Así se ve en el inicio</p>
          {isHero ? (
            <div className="relative h-24 overflow-hidden rounded-xl border border-[#253047]">
              <HomeSlotImage
                slot="hero"
                url={url}
                alt=""
                sizes="320px"
                icon={<StoreIcon className="h-8 w-8" />}
                className="absolute inset-0 h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070B12]/85 to-[#070B12]/50" />
              <p className="relative flex h-full items-center justify-center px-3 text-center text-[11px] font-bold text-white">
                TODO EL STREAMING EN UN{" "}
                <span className="ml-1 bg-gradient-to-r from-[#A78BFA] to-[#22D3EE] bg-clip-text text-transparent">
                  SOLO LUGAR
                </span>
              </p>
            </div>
          ) : (
            <div className="flex overflow-hidden rounded-xl border border-[#253047] bg-[#111827]">
              <HomeSlotImage
                slot={slot}
                url={url}
                alt=""
                sizes="90px"
                icon={<Icon className="h-6 w-6" />}
                className="h-[90px] w-[90px] shrink-0"
              />
              <div className="flex min-w-0 flex-col justify-center p-3">
                <p className="text-[13px] font-semibold text-[#F8FAFC]">{meta.label}</p>
                <p className="text-[11px] text-[#94A3B8]">Vista previa del acceso en celular</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <form
          action={async (formData) => {
            const result = await uploadHomeImageAction(formData);
            onMessage(result.ok ? "Imagen actualizada." : result.error ?? "No se pudo subir", result.ok ? "ok" : "error");
            if (result.ok) router.refresh();
          }}
        >
          <input type="hidden" name="slot" value={slot} />
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#2563EB] px-4 py-2 text-sm font-semibold text-white">
            Cambiar imagen
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            />
          </label>
        </form>
        <Button type="button" variant="secondary" disabled={!url} onClick={() => void remove()}>
          Quitar
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-[#94A3B8]">PNG, JPG o WEBP (máx. 8 MB)</p>
    </Card>
  );
}
