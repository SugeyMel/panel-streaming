"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addWholesaleStockAction, reorderWholesaleCatalogAction, upsertSupplierProductAction } from "@/app/actions/business";
import { SupplierProductImageField } from "@/components/admin/SupplierProductImageField";
import { WholesaleProductImage } from "@/components/panel/WholesaleProductImage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { RegisteredFlash } from "@/components/ui/RegisteredFlash";
import { formatCurrency } from "@/lib/format";
import type { Platform, Supplier, WholesaleCatalogProduct } from "@/lib/types";
import { offerKindLabel, wholesalePricing } from "@/lib/wholesale";

const field = "min-w-0 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F8FAFC]";

export function WholesaleCatalogTab({
  products,
  platforms,
  suppliers,
}: {
  products: WholesaleCatalogProduct[];
  platforms: Platform[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"create" | "edit" | "stock" | null>(null);
  const [editing, setEditing] = useState<WholesaleCatalogProduct | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [imageById, setImageById] = useState<Record<string, string | null>>({});
  const [registered, setRegistered] = useState(false);

  function imageFor(row: WholesaleCatalogProduct) {
    return row.id in imageById ? imageById[row.id] : row.imageUrl;
  }

  return (
    <div className="space-y-3 @lg:space-y-4">
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-end @lg:justify-between">
        <p className="text-[12px] leading-snug text-[#94A3B8] @lg:text-sm">
          Lo que ofreces a tus vendedores. El stock sale de entradas menos ventas, no de un número que edites. Arrastra
          el ícono de cada fila para el orden de la vista previa del vendedor.
        </p>
        <Button
          type="button"
          className="w-full shrink-0 @lg:w-auto"
          onClick={() => {
            setEditing(null);
            setOpen("create");
          }}
        >
          Nuevo producto
        </Button>
      </div>
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <Card>
        <DataTable
          rows={products}
          empty="Aún no hay productos en el catálogo."
          onReorder={async (orderedIds) => {
            const result = await reorderWholesaleCatalogAction(orderedIds);
            setMessage(result.ok ? "Orden actualizado. Así lo ve el vendedor." : result.error ?? "No se pudo guardar el orden");
            if (result.ok) router.refresh();
          }}
          mobileRender={(row) => {
            const platform = platforms.find((item) => item.id === row.platformId) ?? null;
            const pricing = wholesalePricing(row);
            return (
              <article className="rounded-2xl border border-[#253047] bg-[#0B111C] p-3">
                <div className="flex items-start gap-3">
                  <WholesaleProductImage
                    imageUrl={imageFor(row)}
                    platform={platform}
                    name={row.name}
                    allowPlatformFallback={false}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#F8FAFC]">{row.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#94A3B8]">
                      {platform?.name ?? "Sin plataforma"} · {offerKindLabel(row.offerKind)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(pricing.fromPrice)}</p>
                    <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                      Pack {pricing.bulkQty} u.
                      {row.unitPrice > 0 ? ` · 1 u. ${formatCurrency(pricing.unitPrice)}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                      {row.available} disp. · {row.sold} vend. · {row.acquired} ent.
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-[#94A3B8]">
                    {row.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 w-full px-3 text-xs"
                    onClick={() => {
                      setEditing(row);
                      setOpen("edit");
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 w-full px-3 text-xs"
                    onClick={() => {
                      setEditing(row);
                      setOpen("stock");
                    }}
                  >
                    Entrada
                  </Button>
                </div>
              </article>
            );
          }}
          columns={[
            {
              key: "image",
              header: "Imagen",
              render: (row) => (
                <WholesaleProductImage
                  imageUrl={imageFor(row)}
                  platform={platforms.find((item) => item.id === row.platformId) ?? null}
                  name={row.name}
                  allowPlatformFallback={false}
                />
              ),
            },
            { key: "name", header: "Producto", render: (row) => row.name },
            {
              key: "platform",
              header: "Plataforma",
              render: (row) => platforms.find((item) => item.id === row.platformId)?.name ?? "—",
            },
            { key: "kind", header: "Tipo", render: (row) => offerKindLabel(row.offerKind) },
            { key: "cost", header: "Mi costo", render: (row) => formatCurrency(row.costPrice) },
            {
              key: "price",
              header: "Mayorista",
              render: (row) => {
                const pricing = wholesalePricing(row);
                return (
                  <span className="text-sm">
                    <span className="font-semibold text-[#F8FAFC]">{formatCurrency(pricing.fromPrice)}</span>
                    <span className="block text-[11px] text-[#64748B]">
                      Pack {pricing.bulkQty} u.
                      {row.unitPrice > 0 ? ` · 1 u. ${formatCurrency(pricing.unitPrice)}` : ""}
                    </span>
                  </span>
                );
              },
            },
            {
              key: "stock",
              header: "Stock",
              render: (row) => (
                <span className="text-sm">
                  <span className="font-semibold text-[#F8FAFC]">{row.available}</span>
                  <span className="text-[#64748B]"> disp. · {row.sold} vend. · {row.acquired} ent.</span>
                </span>
              ),
            },
            { key: "status", header: "Estado", render: (row) => (row.status === "active" ? "Activo" : "Inactivo") },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 py-1 text-xs"
                    onClick={() => {
                      setEditing(row);
                      setOpen("edit");
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 py-1 text-xs"
                    onClick={() => {
                      setEditing(row);
                      setOpen("stock");
                    }}
                  >
                    Entrada
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={open === "create" || open === "edit"}
        title={editing ? "Editar producto" : "Nuevo producto"}
        onClose={() => setOpen(null)}
      >
        <CatalogProductForm
          key={editing?.id ?? "new"}
          product={editing}
          platforms={platforms}
          onDone={(ok, text, imageUrl, productId) => {
            const wasCreate = !editing;
            setMessage(text);
            if (productId && imageUrl !== undefined) {
              setImageById((prev) => ({ ...prev, [productId]: imageUrl }));
            }
            if (ok) {
              setOpen(null);
              router.refresh();
              if (wasCreate) setRegistered(true);
            } else if (productId) {
              router.refresh();
            }
          }}
        />
      </Modal>

      <Modal open={open === "stock"} title="Registrar entrada de stock" onClose={() => setOpen(null)}>
        {editing ? (
          <form
            className="space-y-3"
            action={async (formData) => {
              formData.set("supplierProductId", editing.id);
              const result = await addWholesaleStockAction(formData);
              setMessage(result.ok ? "Entrada registrada. El disponible se recalculó." : result.error ?? "No se pudo guardar");
              if (result.ok) {
                setOpen(null);
                router.refresh();
              }
            }}
          >
            <p className="text-sm text-[#CBD5E1]">{editing.name}</p>
            <input name="quantity" type="number" min={1} step={1} required placeholder="Cantidad" className={field} />
            <input name="receivedAt" type="date" className={field} />
            <select name="supplierId" className={field} defaultValue={editing.supplierId ?? ""}>
              <option value="">Proveedor (opcional)</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input name="unitCost" type="number" step="0.01" placeholder="Costo unitario (opcional)" className={field} />
            <Button type="submit" className="w-full">
              Guardar entrada
            </Button>
          </form>
        ) : null}
      </Modal>
      <RegisteredFlash open={registered} onClose={() => setRegistered(false)} />
    </div>
  );
}

function CatalogProductForm({
  product,
  platforms,
  onDone,
}: {
  product: WholesaleCatalogProduct | null;
  platforms: Platform[];
  onDone: (ok: boolean, text: string, imageUrl?: string | null, productId?: string) => void;
}) {
  const pickedFile = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        setSaving(true);
        try {
          if (product) formData.set("id", product.id);
          formData.delete("image");
          const result = await upsertSupplierProductAction(formData);
          if (!result.ok) {
            onDone(false, result.error ?? "No se pudo guardar");
            return;
          }
          const productId = result.id;
          if (!productId) {
            onDone(false, "Se guardó el producto, pero no se obtuvo su id.");
            return;
          }
          const file = pickedFile.current;
          const remove = String(formData.get("removeImage") ?? "") === "1";
          if ((file && file.size > 0) || remove) {
            const imageData = new FormData();
            imageData.set("id", productId);
            if (file && file.size > 0) {
              imageData.set("image", file);
            } else {
              imageData.set("removeImage", "1");
            }
            const response = await fetch("/api/admin/supplier-product-image", {
              method: "POST",
              body: imageData,
            });
            let uploaded: { ok?: boolean; error?: string; imageUrl?: string | null } = {};
            try {
              uploaded = (await response.json()) as typeof uploaded;
            } catch {
              uploaded = { ok: false, error: `HTTP ${response.status}` };
            }
            if (!uploaded.ok) {
              onDone(
                true,
                `Producto guardado, pero la imagen no: ${uploaded.error ?? "error"}`,
                result.imageUrl,
                productId,
              );
              return;
            }
            onDone(true, "Producto guardado.", uploaded.imageUrl, productId);
            return;
          }
          onDone(true, "Producto guardado.", result.imageUrl, productId);
        } catch (error) {
          onDone(false, error instanceof Error ? error.message : "No se pudo guardar");
        } finally {
          setSaving(false);
        }
      }}
    >
      <select name="platformId" defaultValue={product?.platformId ?? ""} required className={field}>
        <option value="">Plataforma</option>
        {platforms.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <input name="name" defaultValue={product?.name} required placeholder="Nombre" className={field} />
      <textarea name="description" defaultValue={product?.description} placeholder="Descripción" className={`${field} min-h-20`} />
      <SupplierProductImageField
        imageUrl={product?.imageUrl}
        includeFileName={false}
        onFile={(file) => {
          pickedFile.current = file;
        }}
      />
      <label className="block text-[11px] font-medium text-[#94A3B8]">
        Mi costo (lo que te cuesta a ti)
        <input
          name="costPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={Number.isFinite(product?.costPrice) ? String(product?.costPrice) : "0"}
          placeholder="Ej. 8"
          className={`${field} mt-1`}
        />
      </label>
      <label className="block text-[11px] font-medium text-[#94A3B8]">
        Precio 1 unidad (lo que cobra al vendedor)
        <input
          name="unitPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product && product.unitPrice > 0 ? String(product.unitPrice) : "0"}
          placeholder="Ej. 40"
          className={`${field} mt-1`}
        />
      </label>
      <label className="block text-[11px] font-medium text-[#94A3B8]">
        Precio por unidad del pack (el Desde de la tarjeta)
        <input
          name="wholesalePrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={Number.isFinite(product?.wholesalePrice) ? String(product?.wholesalePrice) : "0"}
          placeholder="Ej. 35"
          className={`${field} mt-1`}
        />
      </label>
      <label className="block text-[11px] font-medium text-[#94A3B8]">
        Unidades del pack
        <input
          name="bulkQty"
          type="number"
          min="2"
          step="1"
          defaultValue={String(product?.bulkQty && product.bulkQty >= 2 ? product.bulkQty : 3)}
          placeholder="3"
          className={`${field} mt-1`}
        />
      </label>
      <p className="text-[11px] leading-snug text-[#94A3B8]">
        El vendedor ve el precio bajo en la tarjeta. En detalles queda claro que ese costo es por unidad al alquilar el
        pack, y que 1 unidad sale más cara.
      </p>
      <select name="offerKind" defaultValue={product?.offerKind ?? "perfil"} className={field}>
        <option value="perfil">Perfil</option>
        <option value="cuenta_completa">Cuenta completa</option>
      </select>
      <select name="status" defaultValue={product?.status === "inactive" ? "inactive" : "active"} className={field}>
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
      </select>
      {product ? <input type="hidden" name="supplierId" value={product.supplierId ?? ""} /> : null}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
