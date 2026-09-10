"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ClockIcon,
  HomeIcon,
  LockIcon,
  OrdersIcon,
  SearchIcon,
  ShoppingBagIcon,
  SupportIcon,
  UsersIcon,
} from "@/components/icons";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { WhatsAppBubble } from "@/components/store/WhatsAppBubble";
import { groupProductOffers, type ProductOffer } from "@/lib/selectors";
import {
  STORE_CATEGORIES,
  platformStoreCategory,
  storeBannerCopy,
  type StoreCategoryId,
} from "@/lib/store-catalog";
import { waLink } from "@/lib/whatsapp";
import type { Platform, Product, Seller } from "@/lib/types";

export function SellerStore({
  seller,
  products,
  platforms,
  checkoutHref,
  showPublicChrome = true,
  navHrefs,
  manageMode = false,
  onManageOffer,
  onCreate,
}: {
  seller: Seller;
  products: Product[];
  platforms: Platform[];
  checkoutHref?: string;
  showPublicChrome?: boolean;
  navHrefs?: {
    home: string;
    store: string;
    orders: string;
    help: string;
    account: string;
  };
  manageMode?: boolean;
  onManageOffer?: (offer: ProductOffer) => void;
  onCreate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StoreCategoryId>("todas");
  const banner = storeBannerCopy(seller);
  const offers = useMemo(
    () => groupProductOffers(manageMode ? products : products.filter((item) => item.active)),
    [manageMode, products],
  );
  const platformOf = (id: string) => platforms.find((item) => item.id === id);
  const links = navHrefs ?? {
    home: `/tienda/${seller.slug}`,
    store: "#catalogo",
    orders: "/pedido",
    help: "/login",
    account: "/login",
  };
  const supportWa =
    !manageMode && seller.whatsapp
      ? waLink(
          seller.whatsapp,
          `Hola ${seller.businessName || seller.name}, vengo de la tienda y quiero información.`,
        )
      : "";

  const visible = offers.filter((offer) => {
    const platform = platformOf(offer.platformId);
    if (!platform) return false;
    if (category !== "todas" && platformStoreCategory(platform) !== category) return false;
    const haystack = `${offer.name} ${offer.description} ${platform.name}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className={`bg-[#0B0F1A] text-[#F1F5F9] ${showPublicChrome ? "pb-16 md:pb-0" : ""}`}>
      {banner.enabled ? (
        <section className="relative overflow-hidden border-b border-[#253047]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={
              banner.imageUrl
                ? { backgroundImage: `url(${banner.imageUrl})` }
                : { background: "linear-gradient(135deg, #1e3a8a 0%, #4c1d95 45%, #0B0F1A 100%)" }
            }
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F1A] via-[#0B0F1A]/80 to-transparent" />
          <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
            <p className="inline-flex rounded-full bg-black/35 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-white">
              {banner.kicker}
            </p>
            <h1 className="mt-3 max-w-xl text-[22px] leading-tight font-bold sm:text-3xl lg:text-4xl">
              {banner.titleLead}{" "}
              <span className="bg-gradient-to-r from-[#60A5FA] to-[#A78BFA] bg-clip-text text-transparent">
                {banner.titleAccent}
              </span>
              .
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-snug text-white/90 sm:text-sm">{banner.description}</p>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {manageMode ? (
          <div className="mb-3 flex items-center justify-end">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-4 py-2 text-[12px] font-semibold text-white"
            >
              + Nuevo producto
            </button>
          </div>
        ) : null}
        <label className="flex items-center gap-2 rounded-2xl border border-[#253047] bg-[#111827] px-3 py-2.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar una plataforma..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[#F1F5F9] outline-none placeholder:text-[#64748B]"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STORE_CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  active
                    ? "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white"
                    : "border border-[#253047] bg-[#111827] text-[#F1F5F9]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div id="catalogo" className="mt-5 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 xl:grid-cols-6">
          {visible.map((offer) => {
            const platform = platformOf(offer.platformId);
            if (!platform) return null;
            return (
              <StoreProductCard
                key={offer.id}
                offer={offer}
                platform={platform}
                checkoutHref={manageMode ? undefined : checkoutHref}
                onViewPlans={manageMode && onManageOffer ? () => onManageOffer(offer) : undefined}
              />
            );
          })}
        </div>
        {visible.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[#94A3B8]">
            Este vendedor no tiene productos publicados en esta categoría.
          </p>
        ) : null}

        <div className="mt-2.5 grid grid-cols-3 gap-1">
          <TrustItem icon={<ClockIcon className="h-[7px] w-[7px]" />} title="Entrega rápida" hint="En minutos" />
          <TrustItem icon={<LockIcon className="h-[7px] w-[7px]" />} title="Pago seguro" hint="Yape, Plin y bancos" />
          <TrustItem icon={<SupportIcon className="h-[7px] w-[7px]" />} title="Soporte" hint="Te ayudamos siempre" />
        </div>
      </div>

      {showPublicChrome ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#253047] bg-[#0B111C]/96 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-5 text-center">
            <StoreTab href={links.home} label="Inicio" icon={HomeIcon} />
            <StoreTab href={links.store} label="Tienda" icon={ShoppingBagIcon} active />
            <StoreTab href={links.orders} label="Mis pedidos" icon={OrdersIcon} />
            <StoreTab href={links.help} label="Ayuda" icon={SupportIcon} />
            <StoreTab href={links.account} label="Mi cuenta" icon={UsersIcon} />
          </div>
        </nav>
      ) : null}
      {supportWa ? <WhatsAppBubble href={supportWa} /> : null}
    </div>
  );
}

function StoreTab({
  href,
  label,
  icon: Icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] leading-tight font-medium ${
        active ? "text-[#A78BFA]" : "text-[#94A3B8]"
      }`}
    >
      <span className={active ? "rounded-full bg-gradient-to-br from-[#2563EB]/35 to-[#7C3AED]/35 p-1.5" : ""}>
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </Link>
  );
}

function TrustItem({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-[3px] rounded-lg border border-[#253047] bg-[#111827] px-[3px] py-[5px] text-center sm:flex-row sm:items-center sm:gap-1.5 sm:px-1.5 sm:py-1.5 sm:text-left">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/20 text-[#60A5FA] sm:h-[18px] sm:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-semibold leading-none text-[#F1F5F9] sm:text-[11px]">{title}</p>
        <p className="mt-px truncate text-[8px] leading-none text-[#94A3B8] sm:text-[10px]">{hint}</p>
      </div>
    </div>
  );
}
