"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addWholesaleStockAction, upsertSupplierProductAction } from "@/app/actions/business";
import { SupplierProductImageField } from "@/components/admin/SupplierProductImageField";
import { WholesaleProductImage } from "@/components/panel/WholesaleProductImage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import type { Platform, Supplier, WholesaleCatalogProduct } from "@/lib/types";
import { offerKindLabel } from "@/lib/wholesale";

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F8FAFC]";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-[#94A3B8]">
          Lo que ofreces a tus vendedores. El stock sale de entradas menos ventas, no de un número que edites.
        </p>
        <Button
          type="button"
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
          columns={[
            {
              key: "image",
              header: "Imagen",
              render: (row) => (
                <WholesaleProductImage
                  imageUrl={row.imageUrl}
                  platform={platforms.find((item) => item.id === row.platformId) ?? null}
                  name={row.name}
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
            { key: "price", header: "Mayorista", render: (row) => formatCurrency(row.wholesalePrice) },
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
          onDone={(ok, text) => {
            setMessage(text);
            if (ok) {
              setOpen(null);
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
  onDone: (ok: boolean, text: string) => void;
}) {
  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        if (product) formData.set("id", product.id);
        const result = await upsertSupplierProductAction(formData);
        onDone(result.ok, result.ok ? "Producto guardado." : result.error ?? "No se pudo guardar");
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
      <textarea name="description" defaultValue={product?.description} placeholder="Descripción" className={field} />
      <SupplierProductImageField imageUrl={product?.imageUrl} />
      <input
        name="costPrice"
        type="number"
        step="0.01"
        defaultValue={product ? String(product.costPrice) : ""}
        placeholder="Mi costo"
        className={field}
      />
      <input
        name="wholesalePrice"
        type="number"
        step="0.01"
        defaultValue={product ? String(product.wholesalePrice) : ""}
        placeholder="Precio mayorista"
        className={field}
      />
      <select name="offerKind" defaultValue={product?.offerKind ?? "perfil"} className={field}>
        <option value="perfil">Perfil</option>
        <option value="cuenta_completa">Cuenta completa</option>
      </select>
      <select name="status" defaultValue={product?.status === "inactive" ? "inactive" : "active"} className={field}>
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
      </select>
      {product ? <input type="hidden" name="supplierId" value={product.supplierId ?? ""} /> : null}
      <Button type="submit" className="w-full">
        Guardar
      </Button>
    </form>
  );
}
