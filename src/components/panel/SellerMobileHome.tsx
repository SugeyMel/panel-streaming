import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  CreditCardIcon,
  InventoryIcon,
  MailIcon,
  OrdersIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import { sellerNav, sellerPrimaryNav, type NavItem } from "@/components/layout/nav";
import { HomeCountUp } from "@/components/panel/HomeCountUp";
import { HomeSlotImage } from "@/components/panel/HomeSlotImage";
import { SalesPerformanceCard } from "@/components/panel/SalesPerformanceCard";
import type { HomeImageSlot, HomeImagesMap } from "@/lib/home-images";
import { groupProductOffers } from "@/lib/selectors";
import type { PaidSale } from "@/lib/sales-performance";
import type { Platform, Product } from "@/lib/types";
import { WholesaleProductImage } from "@/components/panel/WholesaleProductImage";
import { formatStorePrice } from "@/lib/store-catalog";

export type WholesalePreview = {
  id: string;
  name: string;
  wholesalePrice: number;
  imageUrl: string | null;
  platform: Platform | null;
};

function navByHref(href: string): NavItem {
  const item = sellerPrimaryNav.find((entry) => entry.href === href) ?? sellerNav.find((entry) => entry.href === href);
  if (!item) throw new Error(`Falta la entrada de navegación para ${href}.`);
  return item;
}

const vendedoresNav = navByHref("/panel/vendedores");
const finanzasNav = navByHref("/panel/finanzas");

type AccessCard = {
  slot: Exclude<HomeImageSlot, "hero">;
  href: string;
  title: string;
  description: string;
  icon: NavItem["icon"];
  tone: string;
};

const accessCards: AccessCard[] = [
  {
    slot: "tienda",
    href: "/panel/productos",
    title: "Tienda de productos",
    description: "Crear y editar productos, precios y stock",
    icon: ShoppingBagIcon,
    tone: "text-[#F472B6]",
  },
  {
    slot: "clientes",
    href: "/panel/clientes",
    title: "Clientes",
    description: "Añade clientes y registra sus servicios",
    icon: UsersIcon,
    tone: "text-[#C4B5FD]",
  },
  {
    slot: "reportes",
    href: vendedoresNav.href,
    title: "Vendedores",
    description: "Cuentas completas vendidas a tus revendedores",
    icon: vendedoresNav.icon,
    tone: "text-[#D8B4FE]",
  },
  {
    slot: "correos",
    href: "/panel/correos",
    title: "Correos Gmail",
    description: "Correos para códigos de acceso",
    icon: MailIcon,
    tone: "text-[#22D3EE]",
  },
  {
    slot: "inventario",
    href: "/panel/inventario",
    title: "Inventario",
    description: "Stock de cuentas enlazado a la tienda",
    icon: InventoryIcon,
    tone: "text-[#FBBF24]",
  },
  {
    slot: "pagos",
    href: "/panel/configuracion",
    title: "Medios de pago",
    description: "Yape, Plin y cuentas bancarias",
    icon: CreditCardIcon,
    tone: "text-[#60A5FA]",
  },
  {
    slot: "pedidos",
    href: "/panel/pedidos",
    title: "Pedidos",
    description: "Estado, historial y notificaciones",
    icon: OrdersIcon,
    tone: "text-[#F87171]",
  },
  {
    slot: "configuracion",
    href: "/panel/configuracion",
    title: "Configuración",
    description: "Perfil y preferencias",
    icon: SettingsIcon,
    tone: "text-[#CBD5E1]",
  },
];

function firstName(fullName: string) {
  const value = fullName.trim();
  if (!value) return "vendedor";
  return value.split(/\s+/)[0];
}

export function SellerMobileHome({
  sellerName,
  products,
  customerCount,
  pendingOrders,
  sales,
  homeImages,
  paidSales,
  wholesaleItems,
}: {
  sellerName: string;
  products: Product[];
  customerCount: number;
  pendingOrders: number;
  sales: number;
  homeImages: HomeImagesMap;
  paidSales: PaidSale[];
  wholesaleItems: WholesalePreview[];
}) {
  const offers = groupProductOffers(products);
  const activeProducts = offers.filter((item) => item.active).length;
  const heroUrl = homeImages.hero?.url;
  const name = firstName(sellerName);

  return (
    <div className="home-dots -mx-1 space-y-5 px-1 pb-4">
      <section className="home-enter overflow-hidden rounded-3xl border border-[#253047] bg-[#0B111C] lg:rounded-xl">
        <div className="relative h-[100px] max-h-[100px] overflow-hidden md:h-44 md:max-h-none lg:h-[180px]">
          <div className="pointer-events-none absolute inset-0 z-0">
            <HomeSlotImage
              slot="hero"
              url={heroUrl}
              alt="Portada del panel"
              sizes="(max-width: 1024px) 100vw, 1200px"
              icon={<StoreIcon className="h-12 w-12" />}
              className="h-full w-full"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[rgba(11,15,26,0.55)] to-[rgba(11,15,26,0.90)] lg:hidden" />
          <div
            className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(11,15,26,0.97) 0%, rgba(11,15,26,0.95) 26%, rgba(11,15,26,0.28) 48%, rgba(11,15,26,0.95) 72%, rgba(11,15,26,0.97) 100%)",
            }}
          />
          <div className="relative z-[2] hidden h-full items-center justify-between gap-6 px-6 lg:flex">
            <div className="flex min-w-0 items-center gap-6">
              <div className="flex w-[17.5rem] shrink-0 flex-col justify-center">
                <div className="flex items-center gap-3">
                  <span className="inline-grid h-12 w-12 min-h-12 min-w-12 shrink-0 aspect-square place-items-center rounded-2xl bg-[#8B5CF6]/25 text-[#C4B5FD]">
                    <StoreIcon className="h-6 w-6 shrink-0" width={24} height={24} />
                  </span>
                  <div>
                    <h1 className="text-[24px] leading-tight font-bold text-[#F8FAFC]">Hola, {name}</h1>
                    <p className="text-sm text-[#94A3B8]">Panel Vendedor</p>
                  </div>
                </div>
                <p className="mt-2 text-[13px] leading-snug text-[#94A3B8]">
                  Gestiona tus productos, clientes y pedidos de forma rápida y sencilla.
                </p>
              </div>
              <p className="shrink-0 text-left text-[24px] leading-tight font-bold tracking-tight text-white">
                <span className="block">TODO</span>
                <span className="block">
                  EL{" "}
                  <span className="bg-gradient-to-r from-[#A78BFA] via-[#38BDF8] to-[#22D3EE] bg-clip-text text-transparent">
                    STREAMING
                  </span>
                </span>
                <span className="block">
                  EN UN{" "}
                  <span className="bg-gradient-to-r from-[#A78BFA] via-[#38BDF8] to-[#22D3EE] bg-clip-text text-transparent">
                    SOLO LUGAR
                  </span>
                </span>
              </p>
            </div>
            <div className="flex w-[12.5rem] shrink-0 flex-col">
              <HeroSales sales={sales} />
              <p className="mt-1.5 text-center text-[10px] text-[#94A3B8]">Sigue creciendo, vamos por más</p>
            </div>
          </div>
          <div
            className="relative z-[2] grid h-full items-center overflow-hidden p-[10px] md:hidden"
            style={{ gridTemplateColumns: "1fr 104px", gap: 10 }}
          >
            <div
              className="flex min-w-0 flex-col text-left text-white"
              style={{ gap: 3, lineHeight: 1.25, textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-grid h-6 w-6 min-h-6 min-w-6 shrink-0 aspect-square place-items-center rounded-md bg-[#8B5CF6]/25 text-[#C4B5FD]">
                  <StoreIcon className="h-3 w-3 shrink-0" width={12} height={12} />
                </span>
                <h1 className="min-w-0 truncate text-[13px] font-bold text-[#F8FAFC]" style={{ lineHeight: 1.25 }}>
                  Hola, {name}
                </h1>
              </div>
              <p className="text-[9px] text-[#94A3B8]" style={{ lineHeight: 1.25 }}>
                Panel Vendedor
              </p>
              <p className="text-[12px] font-bold" style={{ lineHeight: 1.25 }}>
                TODO EL STREAMING EN
              </p>
              <p className="text-[12px] font-bold" style={{ lineHeight: 1.25 }}>
                <span className="bg-gradient-to-r from-[#A78BFA] via-[#38BDF8] to-[#22D3EE] bg-clip-text text-transparent">
                  UN SOLO LUGAR
                </span>
              </p>
            </div>
            <HeroSales sales={sales} compact />
          </div>
          <div className="relative z-[2] hidden h-full max-h-full flex-col justify-between overflow-hidden p-[14px] md:flex lg:hidden">
            <div className="flex min-h-0 items-center gap-2.5">
              <span className="inline-grid h-9 w-9 min-h-9 min-w-9 shrink-0 aspect-square place-items-center rounded-2xl bg-[#8B5CF6]/25 text-[#C4B5FD]">
                <StoreIcon className="h-5 w-5 shrink-0" width={20} height={20} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base leading-tight font-semibold text-[#F8FAFC]">Hola, {name}</h1>
                <p className="text-xs leading-tight text-[#94A3B8]">Panel Vendedor</p>
              </div>
            </div>
            <p className="text-[15px] leading-snug font-bold tracking-tight text-white">
              TODO EL STREAMING EN UN{" "}
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#38BDF8] to-[#22D3EE] bg-clip-text text-transparent">
                SOLO LUGAR
              </span>
            </p>
            <HeroSales sales={sales} />
          </div>
        </div>
      </section>

      <div className="mt-2 grid h-[52px] max-h-[52px] grid-cols-3 gap-1.5 overflow-hidden md:mt-0 md:h-auto md:max-h-none md:gap-2">
        <MiniStat
          delay={0}
          href="/panel/productos"
          label="Productos"
          value={activeProducts}
          hint="Activos en tu tienda"
          tone="bg-[#EC4899]/15 text-[#F472B6]"
          icon={<ShoppingBagIcon className="h-3 w-3 shrink-0 md:h-4 md:w-4" width={12} height={12} />}
        />
        <MiniStat
          delay={1}
          href="/panel/clientes"
          label="Clientes"
          value={customerCount}
          hint="Registrados"
          tone="bg-[#8B5CF6]/20 text-[#C4B5FD]"
          icon={<UsersIcon className="h-3 w-3 shrink-0 md:h-4 md:w-4" width={12} height={12} />}
        />
        <MiniStat
          delay={2}
          href="/panel/pedidos"
          label="Pedidos"
          value={pendingOrders}
          hint="Pendientes"
          tone="bg-[#EF4444]/15 text-[#F87171]"
          icon={<OrdersIcon className="h-3 w-3 shrink-0 md:h-4 md:w-4" width={12} height={12} />}
        />
      </div>

      <WholesaleHomeStrip items={wholesaleItems} />

      <div className="px-3 md:px-0">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 md:mb-3">
          <h2 className="text-[11px] leading-none font-bold tracking-[0.15em] text-[#B7C7DF] uppercase md:leading-normal">Accesos principales</h2>
          <p className="hidden text-[12px] text-[#94A3B8] md:block">Todo lo que necesitas, en un solo lugar</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5 md:grid-cols-8 md:gap-3">
          {accessCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slot}
                href={item.href}
                className="home-enter group overflow-hidden rounded-xl border border-[#253047] bg-[#111827] transition-transform duration-[250ms] hover:-translate-y-[2px] hover:border-[#42516D]"
                style={{ animationDelay: `${240 + index * 60}ms` }}
              >
                <div className="relative h-12 overflow-hidden md:h-[118px]">
                  <HomeSlotImage
                    slot={item.slot}
                    url={homeImages[item.slot]?.url}
                    alt={item.title}
                    sizes="(max-width: 767px) 25vw, 160px"
                    icon={<Icon className={`h-4 w-4 md:h-8 md:w-8 ${item.tone}`} />}
                    className="h-full w-full"
                    imageClassName="transition-transform duration-[250ms] group-hover:scale-[1.03]"
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: "linear-gradient(to top, rgba(17,24,39,0.95), transparent)",
                    }}
                  />
                </div>
                <span className="flex h-7 items-center gap-1 px-1 md:h-auto md:gap-2 md:p-3">
                  <span
                    className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-md text-[#C4B5FD] md:h-[34px] md:w-[34px] md:rounded-lg"
                    style={{ backgroundColor: "rgba(124,58,237,0.18)" }}
                  >
                    <Icon className="h-3 w-3 md:h-4 md:w-4" width={12} height={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[9px] font-bold leading-none text-white md:text-[13px] md:leading-normal">{item.title}</span>
                    <span className="mt-0.5 hidden line-clamp-2 text-[11px] leading-snug text-[#94A3B8] md:block">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-3 w-3 shrink-0 text-[#64748B] md:h-4 md:w-4" width={12} height={12} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <SalesPerformanceCard sales={paidSales} reportsHref={finanzasNav.href} />
    </div>
  );
}

function HeroSales({ sales, compact = false }: { sales: number; compact?: boolean }) {
  return (
    <Link
      href="/panel/finanzas"
      className={
        compact
          ? "flex h-full min-h-0 w-full min-w-0 flex-col justify-center gap-1 overflow-hidden rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] px-2 py-1.5 text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]"
          : "flex h-[62px] w-full items-center gap-2 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] px-3 py-0 text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)] lg:h-auto lg:w-auto lg:min-w-[11rem] lg:px-4 lg:py-3"
      }
    >
      {compact ? (
        <>
          <span className="flex w-full items-center justify-between gap-1">
            <span className="text-[9px] font-medium tracking-wide text-white/80 uppercase">Ventas</span>
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 opacity-80" width={14} height={14} />
          </span>
          <HomeCountUp value={sales} money className="block w-full truncate text-[16px] leading-none font-bold" />
          <span className="text-[8px] leading-tight text-white/75">Sigue creciendo, vamos por más</span>
        </>
      ) : (
        <>
          <WalletIcon className="h-5 w-5 shrink-0 opacity-90" width={20} height={20} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium tracking-wide text-white/80 uppercase">Ventas</span>
            <HomeCountUp value={sales} money className="block truncate text-sm font-semibold" />
            <span className="mt-0.5 block text-[10px] text-white/75 lg:hidden">Sigue creciendo, vamos por más</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-80" width={16} height={16} />
        </>
      )}
    </Link>
  );
}

function MiniStat({
  href,
  label,
  value,
  hint,
  tone,
  icon,
  delay,
  className = "",
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  tone: string;
  icon: ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`home-enter flex h-full min-h-0 flex-col justify-center rounded-xl border border-[#253047] bg-[#111827] px-1.5 py-1 transition-transform duration-150 hover:-translate-y-0.5 md:rounded-2xl md:px-2.5 md:py-2 ${className}`}
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <span className={`mb-0 inline-grid aspect-square h-3.5 w-3.5 min-h-3.5 min-w-3.5 shrink-0 place-items-center rounded md:mb-1 md:h-7 md:w-7 md:min-h-7 md:min-w-7 md:rounded-lg ${tone}`}>{icon}</span>
      <p className="text-[8px] leading-none font-medium tracking-wide text-[#94A3B8] uppercase md:text-[10px] md:leading-tight">{label}</p>
      <HomeCountUp value={value} className="mt-px block text-[13px] leading-none font-bold text-[#F8FAFC] md:mt-0.5 md:text-xl md:font-semibold" />
      <p className="mt-px truncate text-[8px] leading-none text-[#64748B] md:mt-auto md:line-clamp-2 md:text-[10px] md:leading-tight">{hint}</p>
    </Link>
  );
}

function WholesaleCartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-5 w-5 shrink-0 ${className ?? ""}`} aria-hidden>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h9.4a1.5 1.5 0 0 0 1.5-1.2L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WholesaleHomeStrip({ items }: { items: WholesalePreview[] }) {
  return (
    <section className="home-enter overflow-hidden rounded-xl border border-[#253047]">
      <div className="flex h-[108px] flex-row md:h-[120px]">
        <div
          className="flex w-[150px] shrink-0 flex-col justify-between p-2.5 md:w-[200px] md:flex-row md:items-start md:gap-2.5 md:p-3 lg:w-[240px]"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)" }}
        >
          <div className="flex min-w-0 items-start gap-2">
            <span className="inline-grid h-7 w-7 min-h-7 min-w-7 shrink-0 aspect-square place-items-center rounded-lg bg-white/20 text-white md:h-10 md:w-10 md:min-h-10 md:min-w-10">
              <WholesaleCartIcon />
            </span>
            <div className="min-w-0 flex-1 md:hidden">
              <p className="text-[11px] leading-[1.15] font-bold tracking-wide text-white uppercase">
                Productos
                <br />
                mayoristas
              </p>
            </div>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="text-[13px] leading-tight font-bold text-white uppercase">Productos mayoristas</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">
                Cuentas y servicios disponibles del administrador para tu negocio.
              </p>
              <Link
                href="/panel/mayorista"
                className="mt-2 inline-flex items-center whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#4C1D95]"
              >
                Ver catálogo →
              </Link>
            </div>
          </div>
          <p className="line-clamp-1 text-[9px] leading-snug text-white/80 md:hidden">
            Cuentas y servicios disponibles del administrador para tu negocio.
          </p>
          <Link
            href="/panel/mayorista"
            className="inline-flex h-7 w-full shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-2 text-[10px] font-semibold text-[#4C1D95] md:hidden"
          >
            Ver catálogo
            <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 items-center bg-[#0B111C] px-2 py-2">
          {items.length === 0 ? (
            <p className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-[#253047] px-2 text-center text-[10px] leading-snug text-[#64748B] md:px-3 md:text-[11px]">
              Aún no hay productos mayoristas publicados por el administrador.
            </p>
          ) : (
            <div className="flex h-full items-center gap-2 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex w-[165px] shrink-0 flex-col rounded-lg border border-[#253047] bg-[#111827] p-[10px]"
                >
                  <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-2">
                    <WholesaleProductImage imageUrl={item.imageUrl} platform={item.platform} name={item.name} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[12px] leading-tight font-bold text-[#F8FAFC]">{item.name}</p>
                      <p className="mt-1 text-[14px] leading-none font-bold text-[#F8FAFC]">
                        {formatStorePrice(item.wholesalePrice)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/panel/mayorista"
                    className="mt-2 inline-flex h-7 w-full items-center justify-center rounded-lg border border-[#253047] bg-[#1B2436] text-[11px] font-semibold text-[#F8FAFC]"
                  >
                    Comprar
                  </Link>
                </div>
              ))}
              <Link href="/panel/mayorista" className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 md:w-16">
                <span className="inline-grid h-8 w-8 min-h-8 min-w-8 shrink-0 aspect-square place-items-center rounded-full border border-[#253047] bg-[#111827] text-[#F8FAFC] md:h-9 md:w-9 md:min-h-9 md:min-w-9">
                  <ChevronRightIcon className="h-4 w-4 shrink-0" width={16} height={16} />
                </span>
                <span className="text-[10px] font-medium text-[#94A3B8] md:text-[11px]">Ver todos</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
