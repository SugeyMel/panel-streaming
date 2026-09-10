"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { adminNav, customerNav, sellerPrimaryNav, type NavItem } from "@/components/layout/nav";

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
        ? sellerPrimaryNav
        : adminPrimaryNav;

  const sellerMoreActive =
    variant === "seller" &&
    (moreOpen || !sellerPrimaryNav.some((item) => isActive(pathname, item.href, home)));

  const adminMoreActive =
    variant === "admin" &&
    (moreOpen || !adminPrimaryNav.some((item) => isActive(pathname, item.href, home)));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#253047] bg-[#0B111C]/96 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
      <div
        className={`grid items-center px-1 pt-1 ${
          variant === "seller" ? "grid-cols-6" : variant === "admin" ? "grid-cols-4" : "grid-cols-5"
        }`}
      >
        {variant === "seller" ? (
          <>
            {sellerPrimaryNav.map((item) => (
              <Tab key={item.href} item={item} home={home} pathname={pathname} />
            ))}
            <MoreTab onMore={onMore} active={sellerMoreActive} />
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
}: {
  item: NavItem;
  home: string;
  pathname: string;
  badge?: number;
}) {
  const active = isActive(pathname, item.href, home);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[10px] leading-tight font-medium ${
        active ? "text-[#60A5FA]" : "text-[#94A3B8]"
      }`}
    >
      <span className={`relative rounded-xl p-1 ${active ? "bg-[#1D4ED8]/35" : ""}`}>
        <Icon className={`h-5 w-5 ${active ? "text-[#60A5FA]" : ""}`} />
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

function MoreTab({ onMore, active = false }: { onMore: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onMore}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
        active ? "text-[#A78BFA]" : "text-[#94A3B8]"
      }`}
    >
      <MenuIcon className="h-5 w-5" />
      Más
    </button>
  );
}
