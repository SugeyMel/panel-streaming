"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreIcon, PlusIcon } from "@/components/icons";
import { adminNav, customerNav, sellerNav, type NavItem } from "@/components/layout/nav";

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
  onPlus,
}: {
  variant: "seller" | "admin" | "customer";
  onMore: () => void;
  onPlus?: () => void;
}) {
  const pathname = usePathname();
  const home = homes[variant];
  const tabs =
    variant === "customer"
      ? [customerNav[0], customerNav[1], customerNav[3], customerNav[5]]
      : variant === "seller"
        ? [sellerNav[0], sellerNav[1], sellerNav[7]]
        : [adminNav[0], adminNav[1], adminNav[3], adminNav[10]];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#253047] bg-[#0B111C]/96 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 items-end px-1 pt-1">
        {variant === "seller" ? (
          <>
            <Tab item={tabs[0]} home={home} pathname={pathname} />
            <Tab item={tabs[1]} home={home} pathname={pathname} />
            <button
              type="button"
              onClick={onPlus}
              className="-mt-6 flex flex-col items-center justify-center"
              aria-label="Acciones rápidas"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full cta-gradient text-white shadow-[0_8px_28px_rgba(139,92,246,0.45)]">
                <PlusIcon className="h-7 w-7" />
              </span>
            </button>
            <Tab item={tabs[2]} home={home} pathname={pathname} />
            <MoreTab onMore={onMore} />
          </>
        ) : (
          <>
            {tabs.map((item) => (
              <Tab key={item.href} item={item} home={home} pathname={pathname} />
            ))}
            <MoreTab onMore={onMore} />
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
}: {
  item: NavItem;
  home: string;
  pathname: string;
}) {
  const active = isActive(pathname, item.href, home);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
        active ? "text-[#8B5CF6]" : "text-[#94A3B8]"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-[#8B5CF6]" : ""}`} />
      {item.label.replace(/^Mis /, "").replace(/^./, (letter) => letter.toUpperCase())}
    </Link>
  );
}

function MoreTab({ onMore }: { onMore: () => void }) {
  return (
    <button
      type="button"
      onClick={onMore}
      className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-[#94A3B8]"
    >
      <MoreIcon className="h-5 w-5" />
      Más
    </button>
  );
}
