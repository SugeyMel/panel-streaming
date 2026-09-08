"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelWholesaleSaleAction, upsertWholesaleSaleAction } from "@/app/actions/business";
import { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";
import { WhatsAppMenu } from "@/components/accounts/WhatsAppMenu";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { HealthStatusBadge } from "@/components/ui/StatusBadge";
import {
  colorDias,
  cumpleEstado,
  cumpleVence,
  diasDesdeVencimiento,
  estadoDesdeDias,
  formatDdMmYyyy,
  isoFromToday,
  type EstadoFiltro,
  type VenceFiltro,
} from "@/lib/cuenta-salud";
import { formatCurrency } from "@/lib/format";
import type { Platform, Seller, WholesaleCatalogProduct, WholesaleSale } from "@/lib/types";
import type { FiltroVencimiento } from "@/lib/vencimiento";
import { offerKindLabel, parseOfferKind } from "@/lib/wholesale";

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F8FAFC]";

export function WholesaleSalesBoard({
  sales,
  products,
  platforms,
  sellers,
}: {
  sales: WholesaleSale[];
  products: WholesaleCatalogProduct[];
  platforms: Platform[];
  sellers: Seller[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [plataforma, setPlataforma] = useState("all");
  const [estado, setEstado] = useState<EstadoFiltro>("all");
  const [vence, setVence] = useState<VenceFiltro>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WholesaleSale | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const platformNames = platforms.map((item) => item.name);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales
      .filter((sale) => sale.status === "active")
      .map((sale) => {
        const product = products.find((item) => item.id === sale.supplierProductId);
        const seller = sellers.find((item) => item.id === sale.sellerId);
        const platform =
          platforms.find((item) => item.id === (sale.platformId ?? product?.platformId)) ?? null;
        const dias = diasDesdeVencimiento(sale.expiresAt);
        return { sale, product, seller, platform, dias, health: estadoDesdeDias(dias) };
      })
      .filter((row) => {
        if (plataforma !== "all" && row.platform?.name !== plataforma) return false;
        if (!cumpleEstado(row.dias, estado)) return false;
        if (!cumpleVence(row.dias, vence)) return false;
        if (!q) return true;
        const hay = `${row.seller?.name ?? ""} ${row.platform?.name ?? ""} ${row.product?.name ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [sales, products, platforms, sellers, query, plataforma, estado, vence]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ventas"
        description="Lo que vendiste a tus vendedores, siempre ligado a un producto del catálogo Mayorista."
        action={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Registrar venta
          </Button>
        }
      />
      {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      <AccountsFilterBar
        query={query}
        onQuery={setQuery}
        searchPlaceholder="Buscar vendedor o plataforma"
        servicio={plataforma}
        onServicio={setPlataforma}
        servicios={platformNames}
        servicioAllLabel="Todas las plataformas"
        estado={estado}
        onEstado={setEstado}
        vence={vence}
        onVence={setVence}
        showProveedor={false}
        proveedor="all"
        onProveedor={() => undefined}
        proveedores={[]}
        venceProveedor={"all" as FiltroVencimiento}
        onVenceProveedor={() => undefined}
        fechaProveedor=""
        onFechaProveedor={() => undefined}
      />

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="text-[10px] font-medium tracking-[0.14em] text-[#94A3B8] uppercase">
            <tr>
              <th className="px-2 py-2 font-medium">Vendedor</th>
              <th className="px-2 py-2 font-medium">Producto</th>
              <th className="px-2 py-2 font-medium">Plataforma</th>
              <th className="px-2 py-2 font-medium">Tipo</th>
              <th className="px-2 py-2 font-medium">Fecha de compra</th>
              <th className="px-2 py-2 font-medium">Vencimiento</th>
              <th className="px-2 py-2 font-medium">Días</th>
              <th className="px-2 py-2 font-medium">Costo</th>
              <th className="px-2 py-2 font-medium">Precio</th>
              <th className="px-2 py-2 font-medium">Estado</th>
              <th className="px-2 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-[#94A3B8]">
                  No hay ventas para mostrar.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.sale.id} className="border-t border-[#253047] text-[#F1F5F9]">
                  <td className="px-2 py-3">{row.seller?.name ?? "—"}</td>
                  <td className="px-2 py-3">{row.product?.name ?? "Producto eliminado"}</td>
                  <td className="px-2 py-3">{row.platform?.name ?? "—"}</td>
                  <td className="px-2 py-3">{offerKindLabel(row.sale.offerKind)}</td>
                  <td className="px-2 py-3">{formatDdMmYyyy(row.sale.purchasedAt)}</td>
                  <td className="px-2 py-3">{formatDdMmYyyy(row.sale.expiresAt)}</td>
                  <td className={`px-2 py-3 font-semibold ${colorDias(row.health)}`}>{row.dias}</td>
                  <td className="px-2 py-3">{formatCurrency(row.sale.costPrice)}</td>
                  <td className="px-2 py-3">{formatCurrency(row.sale.wholesalePrice)}</td>
                  <td className="px-2 py-3">
                    <HealthStatusBadge status={row.health} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <WhatsAppMenu
                        destino={
                          row.seller?.whatsapp
                            ? {
                                telefono: row.seller.whatsapp,
                                nombre: row.seller.name,
                                servicio: row.product?.name ?? row.platform?.name ?? "servicio",
                                fecha: formatDdMmYyyy(row.sale.expiresAt),
                                dias: row.dias,
                              }
                            : null
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(row.sale);
                          setOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <form
                        action={async (formData) => {
                          formData.set("id", row.sale.id);
                          const result = await cancelWholesaleSaleAction(formData);
                          setMessage(result.ok ? "Venta anulada. El stock volvió al catálogo." : result.error ?? "No se pudo anular");
                          if (result.ok) router.refresh();
                        }}
                      >
                        <Button type="submit" variant="ghost" className="h-8 px-2 py-1 text-xs">
                          Anular
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? "Editar venta" : "Registrar venta"}
        onClose={() => setOpen(false)}
      >
        <SaleForm
          key={editing?.id ?? "new"}
          sale={editing}
          products={products}
          sellers={sellers}
          onDone={(ok, text) => {
            setMessage(text);
            if (ok) {
              setOpen(false);
              router.refresh();
            }
          }}
        />
      </Modal>
    </div>
  );
}

function SaleForm({
  sale,
  products,
  sellers,
  onDone,
}: {
  sale: WholesaleSale | null;
  products: WholesaleCatalogProduct[];
  sellers: Seller[];
  onDone: (ok: boolean, text: string) => void;
}) {
  const catalog = products.filter((item) => item.status === "active" || item.id === sale?.supplierProductId);
  const [productId, setProductId] = useState(sale?.supplierProductId ?? "");
  const selected = catalog.find((item) => item.id === productId) ?? null;
  const [offerKind, setOfferKind] = useState(sale?.offerKind ?? selected?.offerKind ?? "perfil");
  const [costPrice, setCostPrice] = useState(sale ? String(sale.costPrice) : selected ? String(selected.costPrice) : "");
  const [wholesalePrice, setWholesalePrice] = useState(
    sale ? String(sale.wholesalePrice) : selected ? String(selected.wholesalePrice) : "",
  );

  function pickProduct(id: string) {
    setProductId(id);
    const product = catalog.find((item) => item.id === id);
    if (!product) return;
    setOfferKind(product.offerKind);
    setCostPrice(String(product.costPrice));
    setWholesalePrice(String(product.wholesalePrice));
  }

  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        if (sale) formData.set("id", sale.id);
        formData.set("supplierProductId", productId);
        formData.set("offerKind", offerKind);
        formData.set("costPrice", costPrice);
        formData.set("wholesalePrice", wholesalePrice);
        if (selected?.platformId) formData.set("platformId", selected.platformId);
        const result = await upsertWholesaleSaleAction(formData);
        onDone(result.ok, result.ok ? "Venta guardada." : result.error ?? "No se pudo guardar");
      }}
    >
      <select
        required
        value={productId}
        onChange={(event) => pickProduct(event.target.value)}
        className={field}
      >
        <option value="">Producto del catálogo</option>
        {catalog.map((item) => (
          <option key={item.id} value={item.id} disabled={item.available < 1 && item.id !== sale?.supplierProductId}>
            {item.name} · {item.available} disp.
          </option>
        ))}
      </select>
      <p className="text-xs text-[#94A3B8]">
        {selected
          ? `${selected.platformId ? "Plataforma fijada desde el catálogo. " : ""}Tipo, costo y precio se rellenan; puedes editarlos en esta venta.`
          : "Obligatorio: no se puede escribir un nombre libre."}
      </p>
      <select name="sellerId" required defaultValue={sale?.sellerId ?? ""} className={field}>
        <option value="">Vendedor</option>
        {sellers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        value={offerKind}
        onChange={(event) => setOfferKind(parseOfferKind(event.target.value))}
        className={field}
      >
        <option value="perfil">Perfil</option>
        <option value="cuenta_completa">Cuenta completa</option>
      </select>
      <input
        name="purchasedAt"
        type="date"
        required
        defaultValue={sale?.purchasedAt ?? isoFromToday(0)}
        className={field}
      />
      <input
        name="expiresAt"
        type="date"
        required
        defaultValue={sale?.expiresAt ?? isoFromToday(30)}
        className={field}
      />
      <input
        type="number"
        step="0.01"
        value={costPrice}
        onChange={(event) => setCostPrice(event.target.value)}
        placeholder="Costo"
        className={field}
      />
      <input
        type="number"
        step="0.01"
        value={wholesalePrice}
        onChange={(event) => setWholesalePrice(event.target.value)}
        placeholder="Precio"
        className={field}
      />
      <Button type="submit" className="w-full" disabled={!productId}>
        Guardar
      </Button>
    </form>
  );
}
