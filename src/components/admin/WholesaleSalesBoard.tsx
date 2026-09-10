"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelWholesaleSaleAction, upsertWholesaleSaleAction } from "@/app/actions/business";
import { AccountRowActions } from "@/components/accounts/AccountRowActions";
import { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";
import { AccountsPageHeader } from "@/components/accounts/AccountsPageHeader";
import { AccountsPagination } from "@/components/accounts/AccountsPagination";
import { ServiceMark } from "@/components/accounts/ServiceMark";
import { CalendarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { HealthStatusBadge } from "@/components/ui/StatusBadge";
import {
  colorDias,
  cumpleEstado,
  cumpleVence,
  diasDesdeVencimiento,
  estadoDesdeDias,
  FILAS_POR_PAGINA_DEFAULT,
  formatCosto,
  formatDdMmYyyy,
  isoFromToday,
  parseFilasPorPagina,
  type EstadoFiltro,
  type FilasPorPagina,
  type VenceFiltro,
} from "@/lib/cuenta-salud";
import { platformDisplayName } from "@/lib/platform-logos";
import type { Platform, Seller, WholesaleCatalogProduct, WholesaleSale } from "@/lib/types";
import type { FiltroVencimiento } from "@/lib/vencimiento";
import { offerKindLabel, parseOfferKind } from "@/lib/wholesale";

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F8FAFC]";
const headerGrid =
  "grid grid-cols-[2.25rem_minmax(8rem,1fr)_minmax(8.5rem,1.15fr)_minmax(8rem,1fr)_minmax(6.25rem,0.75fr)_minmax(7rem,0.85fr)_minmax(7rem,0.85fr)_3.25rem_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)_minmax(6.75rem,0.8fr)_minmax(10.5rem,1fr)] items-center gap-x-3";

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
  const [page, setPage] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState<FilasPorPagina>(FILAS_POR_PAGINA_DEFAULT);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WholesaleSale | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [filtros, setFiltros] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const platformNames = platforms.map((item) => platformDisplayName(item));

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
        return {
          sale,
          product,
          seller,
          platform,
          platformName: platform ? platformDisplayName(platform) : "—",
          dias,
          health: estadoDesdeDias(dias),
        };
      })
      .filter((row) => {
        if (plataforma !== "all" && row.platformName !== plataforma) return false;
        if (!cumpleEstado(row.dias, estado)) return false;
        if (!cumpleVence(row.dias, vence)) return false;
        if (!q) return true;
        const hay = `${row.seller?.name ?? ""} ${row.platformName} ${row.product?.name ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [sales, products, platforms, sellers, query, plataforma, estado, vence]);

  const pageSize = Number(filasPorPagina);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const paged = rows.slice(startIndex, startIndex + pageSize);
  const rangeStart = rows.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(rows.length, startIndex + paged.length);

  function goPage1() {
    setPage(1);
  }

  return (
    <div className="min-w-0 overflow-x-hidden bg-[#0B0F1A]">
      <div className="flex flex-col gap-3">
        <AccountsPageHeader
          title="Ventas"
          subtitle="Lo que vendiste a tus vendedores, siempre ligado a un producto del catálogo Mayorista."
          onFiltros={() => setFiltros(true)}
          onAgregar={() => {
            setEditing(null);
            setOpen(true);
          }}
          addLabel="Registrar venta"
        />
        <AccountsFilterBar
          query={query}
          onQuery={(value) => {
            setQuery(value);
            goPage1();
          }}
          searchPlaceholder="Buscar vendedor o plataforma"
          servicio={plataforma}
          onServicio={(value) => {
            setPlataforma(value);
            goPage1();
          }}
          servicios={platformNames}
          servicioAllLabel="Todas las plataformas"
          estado={estado}
          onEstado={(value) => {
            setEstado(value);
            goPage1();
          }}
          vence={vence}
          onVence={(value) => {
            setVence(value);
            goPage1();
          }}
          showProveedor={false}
          proveedor="all"
          onProveedor={() => undefined}
          proveedores={[]}
          venceProveedor={"all" as FiltroVencimiento}
          onVenceProveedor={() => undefined}
          fechaProveedor=""
          onFechaProveedor={() => undefined}
        />
      </div>
      <p className="mt-2 text-right text-xs text-[#94A3B8]">Total: {rows.length} ventas</p>
      {message ? <p className="mt-2 text-sm font-medium text-[#16A34A]">{message}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[1180px] space-y-3">
          <div className={`${headerGrid} text-[10px] font-medium tracking-[0.14em] text-[#94A3B8] uppercase`}>
            <span className="px-3">#</span>
            <span className="px-2">Vendedor</span>
            <span className="px-2">Producto</span>
            <span className="px-2">Plataforma</span>
            <span className="px-2">Tipo</span>
            <span className="px-2">Fecha de compra</span>
            <span className="px-2">Vencimiento</span>
            <span className="px-2">Días</span>
            <span className="px-2 text-right">Costo</span>
            <span className="px-2 text-right">Precio</span>
            <span className="px-2">Estado</span>
            <span className="border-l border-[#253047] px-2 pl-3 text-right tracking-normal">Acciones</span>
          </div>
          {paged.length === 0 ? (
            <p className="rounded-xl border border-[#253047] bg-[#111827] px-4 py-10 text-center text-sm text-[#94A3B8]">
              No hay ventas para mostrar.
            </p>
          ) : (
            paged.map((row, index) => (
              <article key={row.sale.id} className="overflow-hidden rounded-xl border border-[#253047] bg-[#111827]">
                <div className={`${headerGrid} px-0 hover:bg-[#172033]/50`}>
                  <span className="px-3 py-3 text-sm text-[#94A3B8]">{rangeStart + index}</span>
                  <div className="min-w-0 px-2 py-3">
                    <p className="truncate text-sm font-medium text-[#F1F5F9]">{row.seller?.name ?? "—"}</p>
                    {row.seller?.whatsapp ? (
                      <p className="text-xs text-[#94A3B8]">{row.seller.whatsapp}</p>
                    ) : null}
                  </div>
                  <p className="truncate px-2 py-3 text-sm font-semibold text-[#F1F5F9]">
                    {row.product?.name ?? "Producto eliminado"}
                  </p>
                  <div className="flex min-w-0 items-center gap-2 px-2 py-3">
                    <ServiceMark name={row.platformName} />
                    <p className="truncate text-sm font-semibold text-[#F1F5F9]">{row.platformName}</p>
                  </div>
                  <p className="px-2 py-3 text-sm text-[#F1F5F9]">{offerKindLabel(row.sale.offerKind)}</p>
                  <p className="px-2 py-3 text-sm text-[#F1F5F9]">{formatDdMmYyyy(row.sale.purchasedAt)}</p>
                  <div className="flex items-center gap-1 px-2 py-3 text-sm text-[#F1F5F9]">
                    <span>{formatDdMmYyyy(row.sale.expiresAt)}</span>
                    <span className="text-[#94A3B8]" aria-hidden>
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <span className={`px-2 py-3 text-sm font-semibold ${colorDias(row.health)}`}>{row.dias}</span>
                  <p className="px-2 py-3 text-right text-sm text-[#F1F5F9]">{formatCosto(row.sale.costPrice)}</p>
                  <p className="px-2 py-3 text-right text-sm text-[#F1F5F9]">{formatCosto(row.sale.wholesalePrice)}</p>
                  <div className="px-2 py-3">
                    <HealthStatusBadge status={row.health} />
                  </div>
                  <div className="relative flex items-center justify-end gap-0.5 border-l border-[#253047] px-2 py-2">
                    <AccountRowActions
                      whatsapp={
                        row.seller?.whatsapp
                          ? {
                              telefono: row.seller.whatsapp,
                              nombre: row.seller.name,
                              servicio: row.product?.name ?? row.platformName,
                              fecha: formatDdMmYyyy(row.sale.expiresAt),
                              dias: row.dias,
                            }
                          : null
                      }
                      onView={() => {
                        setEditing(row.sale);
                        setOpen(true);
                      }}
                      onEdit={() => {
                        setEditing(row.sale);
                        setOpen(true);
                      }}
                      onMore={() => setMenu(menu === row.sale.id ? null : row.sale.id)}
                    />
                    {menu === row.sale.id ? (
                      <div className="absolute top-10 right-2 z-20 w-40 rounded-lg border border-[#253047] bg-[#111827] py-1 text-xs">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-[#172033]"
                          onClick={() => {
                            setEditing(row.sale);
                            setOpen(true);
                            setMenu(null);
                          }}
                        >
                          Editar
                        </button>
                        <form
                          action={async (formData) => {
                            formData.set("id", row.sale.id);
                            const result = await cancelWholesaleSaleAction(formData);
                            setMenu(null);
                            setMessage(
                              result.ok
                                ? "Venta anulada. El stock volvió al catálogo."
                                : result.error ?? "No se pudo anular",
                            );
                            if (result.ok) router.refresh();
                          }}
                        >
                          <button type="submit" className="block w-full px-3 py-2 text-left text-[#F87171] hover:bg-[#172033]">
                            Anular
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <AccountsPagination
        total={rows.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        page={safePage}
        pageCount={pageCount}
        onPage={setPage}
        filasPorPagina={filasPorPagina}
        onFilasPorPagina={(value) => {
          setFilasPorPagina(parseFilasPorPagina(String(value)));
          goPage1();
        }}
        noun="ventas"
      />

      <Modal open={filtros} title="Filtros avanzados" onClose={() => setFiltros(false)}>
        <AccountsFilterBar
          stacked
          query={query}
          onQuery={(value) => {
            setQuery(value);
            goPage1();
          }}
          searchPlaceholder="Buscar vendedor o plataforma"
          servicio={plataforma}
          onServicio={(value) => {
            setPlataforma(value);
            goPage1();
          }}
          servicios={platformNames}
          servicioAllLabel="Todas las plataformas"
          estado={estado}
          onEstado={(value) => {
            setEstado(value);
            goPage1();
          }}
          vence={vence}
          onVence={(value) => {
            setVence(value);
            goPage1();
          }}
          showProveedor={false}
          proveedor="all"
          onProveedor={() => undefined}
          proveedores={[]}
          venceProveedor={"all" as FiltroVencimiento}
          onVenceProveedor={() => undefined}
          fechaProveedor=""
          onFechaProveedor={() => undefined}
        />
        <Button type="button" className="mt-4 w-full" onClick={() => setFiltros(false)}>
          Listo
        </Button>
      </Modal>

      <Modal open={open} title={editing ? "Editar venta" : "Registrar venta"} onClose={() => setOpen(false)}>
        <SaleForm
          key={editing?.id ?? "new"}
          sale={editing}
          products={products}
          platforms={platforms}
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
  platforms,
  sellers,
  onDone,
}: {
  sale: WholesaleSale | null;
  products: WholesaleCatalogProduct[];
  platforms: Platform[];
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
  const platformName = selected?.platformId
    ? platformDisplayName(platforms.find((item) => item.id === selected.platformId) ?? selected.platformId)
    : null;

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
      <select required value={productId} onChange={(event) => pickProduct(event.target.value)} className={field}>
        <option value="">Producto del catálogo</option>
        {catalog.map((item) => (
          <option key={item.id} value={item.id} disabled={item.available < 1 && item.id !== sale?.supplierProductId}>
            {item.name} · {item.available} disp.
          </option>
        ))}
      </select>
      <p className="text-xs text-[#94A3B8]">
        {selected
          ? `${platformName ? `Plataforma: ${platformName}. ` : ""}Tipo, costo y precio se rellenan; puedes editarlos en esta venta.`
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
      <select value={offerKind} onChange={(event) => setOfferKind(parseOfferKind(event.target.value))} className={field}>
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
