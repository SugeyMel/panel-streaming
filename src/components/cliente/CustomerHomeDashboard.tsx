import Link from "next/link";
import {
  AlertIcon,
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CrownIcon,
  KeyIcon,
  OrdersIcon,
  PlatformsIcon,
  PlayIcon,
  SettingsIcon,
  ShieldIcon,
  ShoppingBagIcon,
  SupportIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { CustomerSquareLogo, customerBrandSurfaceStyle } from "@/components/cliente/CustomerSquareLogo";
import { ImageWithDominantFill } from "@/components/media/ImageWithDominantFill";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { daysRemaining, formatCurrency, formatDate, orderStatusLabel, serviceStatusFromDates } from "@/lib/format";
import {
  customerBrandCardStyle,
  orderPlatformLabel,
  platformDisplayName,
  platformLogoSrc,
} from "@/lib/platform-logos";
import { formatStorePrice } from "@/lib/store-catalog";
import { waLink } from "@/lib/whatsapp";
import type { Order, OrderStatus, Platform, Product, Subscription } from "@/lib/types";

const CHIPS = [
  { label: "Películas y series", href: "/cliente/comprar" },
  { label: "Anime", href: "/cliente/comprar" },
  { label: "Deportes", href: "/cliente/comprar" },
  { label: "Más plataformas", href: "/cliente/comprar" },
] as const;

const ORDER_PILL: Record<OrderStatus, string> = {
  pendiente_pago: "bg-[#F97316] text-white",
  pago_enviado: "bg-[#38BDF8] text-[#0B111C]",
  pago_aprobado: "bg-[#22C55E] text-white",
  preparando: "bg-[#7C3AED] text-white",
  entregado: "bg-[#16A34A] text-white",
  cancelado: "bg-[#EF4444] text-white",
};

const ORDER_SHORT: Record<OrderStatus, string> = {
  pendiente_pago: "Pendiente",
  pago_enviado: "Pago enviado",
  pago_aprobado: "Pagado",
  preparando: "En revisión",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const PROMO_BADGES = ["Popular", "Oferta", "Nuevo"] as const;

function featuredPromos(products: Product[], platforms: Platform[]) {
  const byPlatform = new Map<string, Product>();
  for (const product of products) {
    if (!product.active || product.soldOut) continue;
    const current = byPlatform.get(product.platformId);
    if (!current || product.salePrice < current.salePrice) byPlatform.set(product.platformId, product);
  }
  return [...byPlatform.values()]
    .sort((a, b) => Number(b.onOffer) - Number(a.onOffer) || a.salePrice - b.salePrice)
    .slice(0, 8)
    .map((product, index) => ({
      product,
      platform: platforms.find((item) => item.id === product.platformId),
      badge: product.onOffer ? "Oferta" : PROMO_BADGES[index] ?? "Nuevo",
    }));
}

function mobileFeaturedPromos(
  promos: ReturnType<typeof featuredPromos>,
  products: Product[],
  platforms: Platform[],
) {
  if (promos.length >= 8) return promos;
  const used = new Set(promos.map((item) => item.product.id));
  const extra: typeof promos = [];
  const rest = products
    .filter((item) => item.active && !item.soldOut && !used.has(item.id))
    .sort((a, b) => Number(b.onOffer) - Number(a.onOffer) || a.salePrice - b.salePrice);
  for (const product of rest) {
    extra.push({
      product,
      platform: platforms.find((item) => item.id === product.platformId),
      badge: product.onOffer ? "Oferta" : "Nuevo",
    });
    if (promos.length + extra.length >= 8) break;
  }
  return [...promos, ...extra];
}

function planLabel(subscription: Subscription, products: Product[]) {
  const product = products.find((item) => item.id === subscription.productId);
  if (product?.name) return product.name;
  if (subscription.durationMonths) return `${subscription.durationMonths} mes${subscription.durationMonths === 1 ? "" : "es"}`;
  return "Plan activo";
}

function faltanLabel(endDate: string) {
  const days = daysRemaining(endDate);
  if (days > 1) return `Faltan: ${days} días`;
  if (days === 1) return "Falta: 1 día";
  if (days === 0) return "Vence hoy";
  return `Vencido hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
}

export function CustomerHomeDashboard({
  customerName,
  sellerName,
  sellerWhatsapp,
  services,
  orders,
  platforms,
  products,
}: {
  customerName: string;
  sellerName: string;
  sellerWhatsapp: string;
  services: Subscription[];
  orders: Order[];
  platforms: Platform[];
  products: Product[];
}) {
  const listed = services.filter((item) => item.status !== "cancelado");
  const expiring = listed.filter((item) => {
    const days = daysRemaining(item.endDate);
    return days >= 0 && days <= 7;
  });
  const pending = orders.filter((item) => ["pendiente_pago", "pago_enviado"].includes(item.status));
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const promos = featuredPromos(products, platforms);
  const mobilePromos = mobileFeaturedPromos(promos, products, platforms);
  const wa = sellerWhatsapp
    ? waLink(sellerWhatsapp, `Hola ${sellerName}, soy ${customerName}. Necesito ayuda con mi cuenta.`)
    : "";

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
      <div className="min-w-0 space-y-3">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4C1D95] via-[#6D28D9] to-[#DB2777] p-3.5 sm:p-4">
          <div className="pointer-events-none absolute -top-16 right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">¡Hola, {customerName.trim()}!</h1>
              <p className="mt-0.5 text-xs text-white/80 sm:text-sm">Todo tu entretenimiento en un solo lugar.</p>
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CHIPS.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
              {mobilePromos.length > 0 ? (
                <div className="mt-3 sm:hidden">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-white">
                      <CrownIcon className="h-3.5 w-3.5 shrink-0 text-[#FBBF24]" />
                      Promociones destacadas
                    </p>
                    <Link href="/cliente/comprar" className="inline-flex shrink-0 items-center text-[11px] font-medium text-white/85">
                      Ver todos <ChevronRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden">
                    {mobilePromos.map(({ product, platform, badge }) => (
                      <CustomerPromoCard
                        key={product.id}
                        product={product}
                        platform={platform}
                        badge={badge}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <Link
                href="/cliente/comprar"
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full bg-white text-xs font-semibold text-[#6D28D9] sm:hidden"
              >
                Ir a la tienda
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
            <Link
              href="/cliente/comprar"
              className="hidden shrink-0 items-center gap-3 rounded-2xl bg-black/20 px-3 py-2.5 sm:inline-flex"
            >
              <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#C4B5FD] to-[#7C3AED] shadow-[0_8px_24px_rgba(91,33,182,0.45)]">
                <ShoppingBagIcon className="h-7 w-7 text-white" />
                <span className="absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full bg-[#F8FAFC] text-[#7C3AED] shadow">
                  <PlayIcon className="h-3 w-3 translate-x-px" />
                </span>
              </span>
              <span className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold text-[#6D28D9]">
                Ir a la tienda
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard icon={PlatformsIcon} value={listed.length} label="Servicios activos" tone="blue" />
          <StatCard icon={ClockIcon} value={expiring.length} label="Por vencer" tone="orange" />
          <StatCard icon={AlertIcon} value={pending.length} label="Pendiente" tone="red" />
          <StatCard icon={ShoppingBagIcon} value={orders.length} label="Pedidos totales" tone="violet" />
        </section>

        <QuickAccess className="lg:hidden" />

        <section className="space-y-2">
          <SectionTitle href="/cliente/servicios">Mis servicios</SectionTitle>
          {listed.length === 0 ? (
            <p className="rounded-2xl border border-[#253047] bg-[#111827] px-4 py-6 text-center text-sm text-[#94A3B8]">
              Aún no tienes servicios activos.{" "}
              <Link href="/cliente/comprar" className="text-[#C4B5FD]">
                Ir a la tienda
              </Link>
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {listed.map((subscription) => {
                const platform = platforms.find((item) => item.id === subscription.platformId);
                const name = platformDisplayName(platform ?? subscription.platformId) || platform?.name || "Servicio";
                const status = serviceStatusFromDates(subscription.endDate, subscription.status);
                const days = daysRemaining(subscription.endDate);
                return (
                  <article
                    key={subscription.id}
                    className="overflow-hidden rounded-2xl border p-3"
                    style={customerBrandSurfaceStyle(platform ?? subscription.platformId)}
                  >
                    <div className="flex items-start gap-2.5">
                      <CustomerSquareLogo platform={platform ?? subscription.platformId} title={name} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{name}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              status === "activo"
                                ? "bg-[#16A34A] text-white"
                                : status === "proximo_a_vencer"
                                  ? "bg-[#F59E0B] text-[#1C1917]"
                                  : "bg-[#DC2626] text-white"
                            }`}
                          >
                            {status === "activo" ? "Activo" : status === "proximo_a_vencer" ? "Por vencer" : "Vencido"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-white/75">Plan: {planLabel(subscription, products)}</p>
                        <p className="text-[11px] text-white/75">Vence: {formatDate(subscription.endDate)}</p>
                        <p className={`mt-1 text-xs font-semibold ${days < 0 ? "text-[#F87171]" : "text-[#4ADE80]"}`} suppressHydrationWarning>
                          {faltanLabel(subscription.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                      <Link
                        href={`/cliente/servicios/${subscription.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-white/15 bg-black/20 text-[11px] font-medium text-[#E2E8F0]"
                      >
                        Ver detalles
                      </Link>
                      {subscription.renewalIntent === "decline" ? (
                        <span className="inline-flex h-8 items-center justify-center rounded-lg text-[11px] text-white/60">
                          No se renueva
                        </span>
                      ) : (
                        <Link
                          href={`/cliente/renovar/${subscription.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#DB2777] text-[11px] font-semibold text-white"
                        >
                          {subscription.renewalIntent === "renew" ? "Comprobante" : "Renovar"}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {promos.length > 0 ? (
          <section className="hidden space-y-2 sm:block">
            <SectionTitle href="/cliente/comprar">Promociones destacadas</SectionTitle>
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible [&::-webkit-scrollbar]:hidden">
              {promos.map(({ product, platform, badge }) => (
                <CustomerPromoCard key={product.id} product={product} platform={platform} badge={badge} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <SectionTitle href="/cliente/pedidos">Mis pedidos recientes</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-[#253047] bg-[#111827]">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#94A3B8]">Aún no hay pedidos en esta cuenta.</p>
            ) : (
              <>
                <div className="divide-y divide-[#1E293B] lg:hidden">
                  {recent.map((order) => (
                    <Link
                      key={order.id}
                      href={order.status === "entregado" ? "/cliente/acceso" : "/cliente/pedidos"}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <PlatformLogo platform={order.platformName || order.platformId} size={22} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{order.code}</p>
                        <p className="truncate text-[11px] text-[#94A3B8]">
                          {orderPlatformLabel(order, platforms)} · {formatCurrency(order.amount)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ORDER_PILL[order.status]}`}>
                        {ORDER_SHORT[order.status]}
                      </span>
                    </Link>
                  ))}
                </div>
                <table className="hidden w-full text-left text-[12px] lg:table">
                  <thead className="bg-[#0F172A] text-[10px] font-medium tracking-[0.12em] text-[#94A3B8] uppercase">
                    <tr>
                      <th className="px-3 py-2"># Pedido</th>
                      <th className="px-3 py-2">Plataforma</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((order) => (
                      <tr key={order.id} className="border-t border-[#1E293B]">
                        <td className="px-3 py-2 font-semibold whitespace-nowrap text-white">{order.code}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5 text-[#F8FAFC]">
                            <PlatformLogo platform={order.platformName || order.platformId} size={18} />
                            {orderPlatformLabel(order, platforms)}
                          </span>
                        </td>
                        <td className="max-w-[9rem] truncate px-3 py-2 text-[#CBD5E1]">{order.planName || "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-white">
                          {formatCurrency(order.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${ORDER_PILL[order.status]}`}>
                            {ORDER_SHORT[order.status] || orderStatusLabel[order.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[#94A3B8]">{formatDate(order.createdAt)}</td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={order.status === "entregado" ? "/cliente/acceso" : "/cliente/pedidos"}
                            className="inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-medium text-[#C4B5FD] hover:bg-[#172033]"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </section>

        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-[#16A34A] px-3 py-2.5 text-sm font-semibold text-white lg:hidden"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Contactar por WhatsApp
            <ArrowRightIcon className="ml-auto h-4 w-4" />
          </a>
        ) : null}
      </div>

      <aside className="hidden space-y-3 lg:block">
        <Link
          href="/cliente/comprar"
          className="block overflow-hidden rounded-2xl border border-[#7C3AED]/40 bg-gradient-to-br from-[#2E1064] to-[#111827] p-3.5"
        >
          <p className="text-[11px] font-medium tracking-wide text-[#C4B5FD] uppercase">Tienda</p>
          <p className="mt-1 text-sm font-semibold text-white">Tienda de plataformas</p>
          <p className="mt-1 text-[11px] text-[#94A3B8]">Netflix, Disney+, HBO MAX y más. Elige y paga en minutos.</p>
          <span className="mt-3 inline-flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#DB2777] px-3 text-xs font-semibold text-white">
            Ver catálogo
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </Link>
        <QuickAccess />
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-gradient-to-br from-[#5B21B6] to-[#1E1B4B] p-3.5"
          >
            <p className="text-sm font-semibold text-white">¿Necesitas ayuda?</p>
            <p className="mt-0.5 text-[11px] text-white/70">Respuesta rápida por WhatsApp</p>
            <span className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#22C55E] text-xs font-semibold text-white">
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Contactar por WhatsApp
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </span>
          </a>
        ) : null}
        <div className="flex items-center justify-between gap-1 px-1 text-[10px] text-[#64748B]">
          <span className="inline-flex items-center gap-1">
            <ShieldIcon className="h-3 w-3 text-[#22C55E]" /> Seguro
          </span>
          <span className="inline-flex items-center gap-1">
            <BoltIcon className="h-3 w-3 text-[#FBBF24]" /> Rápido
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckIcon className="h-3 w-3 text-[#38BDF8]" /> Confiable
          </span>
        </div>
      </aside>
    </div>
  );
}

function CustomerPromoCard({
  product,
  platform,
  badge,
  compact = false,
}: {
  product: Product;
  platform?: Platform;
  badge: string;
  compact?: boolean;
}) {
  const title = compact
    ? platformDisplayName(platform ?? product.platformId) || platform?.name || product.name || "Plataforma"
    : product.name || platform?.name || platformDisplayName(product.platformId) || "Plataforma";
  const surface = customerBrandSurfaceStyle(platform ?? product.platformId);
  const { theme } = customerBrandCardStyle(platform ?? product.platformId);

  if (compact) {
    const cover = platformLogoSrc(platform ?? product.platformId);
    const discount =
      product.compareAtPrice != null && product.compareAtPrice > product.salePrice
        ? Math.max(1, Math.round(((product.compareAtPrice - product.salePrice) / product.compareAtPrice) * 100))
        : null;

    const kicker = platform?.tagline?.trim() ?? "";

    return (
      <Link
        href={`/cliente/checkout?producto=${product.id}`}
        className="relative aspect-[4/5] flex-[0_0_calc((100%-0.5rem)/2.15)] snap-start overflow-hidden rounded-2xl bg-[#0D1320] shadow-[0_12px_24px_rgba(0,0,0,0.32)] ring-1 ring-white/12"
      >
        {cover ? (
          <ImageWithDominantFill src={cover} alt={title} fallback={platform?.accentFrom || "#0D1320"} />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white">{title.slice(0, 1)}</span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        {discount ? (
          <span className="absolute top-2 left-2 z-[1] rounded-2xl bg-gradient-to-br from-[#FDE68A] to-[#F59E0B] px-2 py-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
            <span className="block text-[13px] leading-none font-black text-[#1C1917]">-{discount}%</span>
            <span className="mt-0.5 block text-[8px] leading-none font-bold tracking-wide text-[#1C1917]">DSCTO</span>
          </span>
        ) : null}
        {kicker ? (
          <span className="absolute inset-x-2 bottom-[3.15rem] z-[1] line-clamp-2 text-[11px] font-semibold leading-snug text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
            {kicker}
          </span>
        ) : null}
        <span className="absolute inset-x-2 bottom-2 z-[1] flex items-center gap-1 rounded-2xl bg-black/60 px-2.5 py-1.5 backdrop-blur-[8px]">
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] leading-none text-white/70">Desde</span>
            <span className="mt-0.5 block truncate text-[15px] font-bold leading-none text-white">
              {formatStorePrice(product.salePrice)}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/85" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/cliente/checkout?producto=${product.id}`}
      className="relative flex min-h-[4.5rem] min-w-[15.75rem] flex-1 items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 sm:min-w-0"
      style={surface}
    >
      <span
        className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
        style={{ backgroundColor: theme.badge }}
      >
        {badge}
      </span>
      <CustomerSquareLogo platform={platform ?? product.platformId} title={title} size={48} />
      <div className="min-w-0 flex-1 pr-14">
        <p className="truncate text-[15px] font-semibold leading-tight text-white">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-white/90">Desde {formatCurrency(product.salePrice)}</p>
      </div>
    </Link>
  );
}

function SectionTitle({ href, children }: { href: string; children: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-white">{children}</h2>
      <Link href={href} className="inline-flex items-center text-[11px] font-medium text-[#C4B5FD]">
        Ver todos <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof PlatformsIcon;
  value: number;
  label: string;
  tone: "blue" | "orange" | "red" | "violet";
}) {
  const colors = {
    blue: "text-[#38BDF8] bg-[#38BDF8]/12 border-[#38BDF8]/25",
    orange: "text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/25",
    red: "text-[#F87171] bg-[#EF4444]/12 border-[#EF4444]/25",
    violet: "text-[#C4B5FD] bg-[#8B5CF6]/12 border-[#8B5CF6]/25",
  }[tone];
  return (
    <div className={`flex items-center gap-2 rounded-2xl border bg-[#111827] px-2.5 py-2 ${colors}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black/20">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none text-white">{value}</p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-[#94A3B8]">{label}</p>
      </div>
    </div>
  );
}

function QuickAccess({ className = "" }: { className?: string }) {
  const items = [
    { href: "/cliente/acceso", label: "Solicitar código", icon: KeyIcon, tone: "text-[#38BDF8] bg-[#38BDF8]/15" },
    { href: "/cliente/pedidos", label: "Mis pedidos", icon: OrdersIcon, tone: "text-[#A78BFA] bg-[#8B5CF6]/15" },
    { href: "/cliente/soporte", label: "Centro de ayuda", icon: SupportIcon, tone: "text-[#FBBF24] bg-[#F59E0B]/15" },
    { href: "/cliente/cuenta", label: "Mi cuenta", icon: SettingsIcon, tone: "text-[#4ADE80] bg-[#22C55E]/15" },
  ] as const;
  return (
    <section className={`rounded-2xl border border-[#253047] bg-[#111827] p-2.5 ${className}`}>
      <p className="mb-1.5 px-1 text-[11px] font-semibold text-white">Accesos rápidos</p>
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[#172033]"
            >
              <span className={`grid h-7 w-7 place-items-center rounded-lg ${item.tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-[#E2E8F0]">{item.label}</span>
              <ChevronRightIcon className="h-3.5 w-3.5 text-[#64748B]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
