"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { adminNav, customerNav, sellerMobileNav, type NavItem } from "@/components/layout/nav";

const adminPrimaryNav: NavItem[] = [adminNav[0], adminNav[1], adminNav[2]];

const homes = {
  admin: "/admin",
  seller: "/panel",
  customer: "/cliente",
} as const;

function isActive(pathname: string, href: string, home: string) {
  return href === home ? pathname === href : pathname.startsWith(href);
}

export function BottomNav({
  variant,
  onMore,
  moreOpen = false,
}: {
  variant: "seller" | "admin" | "customer";
  onMore: () => void;
  moreOpen?: boolean;
}) {
  const pathname = usePathname();
  const home = homes[variant];
  const tabs =
    variant === "customer"
      ? [customerNav[0], customerNav[1], customerNav[3], customerNav[5]]
      : variant === "seller"
        ? sellerMobileNav
        : adminPrimaryNav;

  const sellerMoreActive =
    variant === "seller" &&
    (moreOpen || !sellerMobileNav.some((item) => isActive(pathname, item.href, home)));

  const adminMoreActive =
    variant === "admin" &&
    (moreOpen || !adminPrimaryNav.some((item) => isActive(pathname, item.href, home)));

  const light = variant === "seller" && (pathname === "/panel/clientes" || pathname === "/panel/vendedores");

  return (
    <nav className={`fixed inset-x-0 bottom-0 z-30 border-t pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden ${
      light ? "border-[#E2E8F0] bg-[#F4F7FB]/96" : "border-[#253047] bg-[#0B111C]/96"
    }`}>
      <div
        className={`grid items-center px-1 pt-1 ${
          variant === "seller" ? "grid-cols-6" : variant === "admin" ? "grid-cols-4" : "grid-cols-5"
        }`}
      >
        {variant === "seller" ? (
          <>
            {sellerMobileNav.map((item) => (
              <Tab key={item.href} item={item} home={home} pathname={pathname} light={light} />
            ))}
            <MoreTab onMore={onMore} active={sellerMoreActive} light={light} />
          </>
        ) : (
          <>
            {tabs.map((item) => (
              <Tab key={item.href} item={item} home={home} pathname={pathname} />
            ))}
            <MoreTab onMore={onMore} active={variant === "admin" ? adminMoreActive : moreOpen} />
          </>
        )}
      </div>
    </nav>
  );
}

function Tab({
  item,
  home,
  pathname,
  badge = 0,
  light = false,
}: {
  item: NavItem;
  home: string;
  pathname: string;
  badge?: number;
  light?: boolean;
}) {
  const active = isActive(pathname, item.href, home);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[10px] leading-tight font-medium ${
        light
          ? active
            ? "text-[#2563EB]"
            : "text-[#64748B]"
          : active
            ? "text-[#60A5FA]"
            : "text-[#94A3B8]"
      }`}
    >
      <span className={`relative rounded-xl p-1 ${active ? (light ? "bg-[#DBEAFE]" : "bg-[#1D4ED8]/35") : ""}`}>
        <Icon className={`h-5 w-5 ${active ? (light ? "text-[#2563EB]" : "text-[#60A5FA]") : ""}`} />
        {badge > 0 ? (
          <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-[#EF4444] px-1 text-[9px] font-semibold leading-4 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {item.label}
    </Link>
  );
}

function MoreTab({ onMore, active = false, light = false }: { onMore: () => void; active?: boolean; light?: boolean }) {
  return (
    <button
      type="button"
      onClick={onMore}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
        light ? (active ? "text-[#2563EB]" : "text-[#64748B]") : active ? "text-[#A78BFA]" : "text-[#94A3B8]"
      }`}
    >
      <MenuIcon className="h-5 w-5" />
      Más
    </button>
  );
}
