import type { ComponentType, SVGProps } from "react";
import {
  FinanceIcon,
  HistoryIcon,
  HomeIcon,
  InventoryIcon,
  KeyIcon,
  MailIcon,
  OrdersIcon,
  PlatformsIcon,
  ProductsIcon,
  ReceiptIcon,
  ReportIcon,
  SalesIcon,
  SearchIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SupportIcon,
  UsersIcon,
} from "@/components/icons";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  /** Otras rutas que también marcan este botón como activo (ej. "Base de datos" = Clientes + Vendedores). */
  also?: string[];
};

/** ¿El botón del menú está activo para la ruta actual? */
export function navItemActive(item: NavItem, pathname: string, home: string) {
  if (item.href === home) return pathname === item.href;
  return pathname.startsWith(item.href) || (item.also ?? []).some((path) => pathname.startsWith(path));
}

/** "Base de datos" agrupa Clientes y Vendedores (excel de cuentas). */
const baseDatosItem: NavItem = {
  href: "/panel/clientes",
  label: "Base de datos",
  icon: UsersIcon,
  also: ["/panel/vendedores"],
};

export const sellerPrimaryNav: NavItem[] = [
  { href: "/panel", label: "Consultas", icon: SearchIcon },
  { href: "/panel/correos", label: "Mi Bot", icon: MailIcon },
  { href: "/panel/productos", label: "Tienda", icon: ShoppingBagIcon },
  baseDatosItem,
  { href: "/panel/pedidos", label: "Pedidos", icon: OrdersIcon },
];

/** Menú superior en computadora: igual que el principal, con "Mis cuentas" junto a Consultas. */
export const sellerDesktopNav: NavItem[] = [
  { href: "/panel", label: "Consultas", icon: SearchIcon },
  { href: "/panel/cuentas", label: "Mis cuentas", icon: PlatformsIcon },
  { href: "/panel/correos", label: "Mi Bot", icon: MailIcon },
  { href: "/panel/productos", label: "Tienda", icon: ShoppingBagIcon },
  baseDatosItem,
  { href: "/panel/pedidos", label: "Pedidos", icon: OrdersIcon },
];

/** Barra inferior en celular (5 botones + Más): "Mis cuentas" junto a Consultas; Tienda queda en Más. */
export const sellerMobileNav: NavItem[] = [
  { href: "/panel", label: "Consultas", icon: SearchIcon },
  { href: "/panel/cuentas", label: "Mis cuentas", icon: PlatformsIcon },
  { href: "/panel/correos", label: "Mi Bot", icon: MailIcon },
  { ...baseDatosItem, label: "Base datos" },
  { href: "/panel/pedidos", label: "Pedidos", icon: OrdersIcon },
];

export const sellerNav: NavItem[] = [
  { href: "/panel", label: "Consultas", icon: SearchIcon },
  { href: "/panel/cuentas", label: "Mis cuentas", icon: PlatformsIcon },
  { href: "/panel/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/panel/vendedores", label: "Vendedores", icon: UsersIcon },
  { href: "/panel/servicios", label: "Servicios", icon: PlatformsIcon },
  { href: "/panel/productos", label: "Productos", icon: ProductsIcon },
  { href: "/panel/mayorista", label: "Mayorista", icon: InventoryIcon },
  { href: "/panel/inventario", label: "Inventario", icon: InventoryIcon },
  { href: "/panel/pedidos", label: "Pedidos", icon: OrdersIcon },
  { href: "/panel/ventas", label: "Ventas", icon: SalesIcon },
  { href: "/panel/finanzas", label: "Finanzas", icon: FinanceIcon },
  { href: "/panel/comprobantes", label: "Comprobantes", icon: ReceiptIcon },
  { href: "/panel/correos", label: "Mi Bot", icon: MailIcon },
  { href: "/panel/acceso", label: "Centro de acceso", icon: KeyIcon },
  { href: "/panel/soporte", label: "Soporte", icon: SupportIcon },
  { href: "/panel/usuarios-clientes", label: "Usuarios de clientes", icon: UsersIcon },
  { href: "/panel/configuracion", label: "Configuración", icon: SettingsIcon },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: HomeIcon },
  { href: "/admin/vendedores", label: "Vendedores", icon: UsersIcon },
  { href: "/admin/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/admin/productos", label: "Productos venta directa", icon: ProductsIcon },
  { href: "/admin/pedidos", label: "Pedidos", icon: OrdersIcon },
  { href: "/admin/ventas", label: "Ventas", icon: SalesIcon },
  { href: "/admin/mayorista", label: "Mayorista", icon: InventoryIcon },
  { href: "/admin/inventario", label: "Inventario", icon: InventoryIcon },
  { href: "/admin/cuentas", label: "Cuentas asignadas", icon: PlatformsIcon },
  { href: "/admin/correos", label: "Centro de códigos", icon: MailIcon },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: SupportIcon },
  { href: "/admin/reportes", label: "Reportes", icon: ReportIcon },
  { href: "/admin/historial", label: "Historial", icon: HistoryIcon },
  { href: "/admin/configuracion", label: "Configuración", icon: SettingsIcon },
];

export const customerNav: NavItem[] = [
  { href: "/cliente", label: "Inicio", icon: HomeIcon },
  { href: "/cliente/comprar", label: "Tienda", icon: ProductsIcon },
  { href: "/cliente/servicios", label: "Mis servicios", icon: PlatformsIcon },
  { href: "/cliente/pedidos", label: "Mis pedidos", icon: OrdersIcon },
  { href: "/cliente/acceso", label: "Centro de acceso", icon: KeyIcon },
  { href: "/cliente/soporte", label: "Ayuda", icon: SupportIcon },
  { href: "/cliente/cuenta", label: "Mi cuenta", icon: SettingsIcon },
];
