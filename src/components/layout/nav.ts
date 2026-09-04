import type { ComponentType, SVGProps } from "react";
import {
  DashboardIcon,
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
  SettingsIcon,
  SupportIcon,
  UsersIcon,
} from "@/components/icons";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type NavItem = {
  href: string;
  label: string;
  icon: IconType;
};

export const sellerNav: NavItem[] = [
  { href: "/panel", label: "Inicio", icon: HomeIcon },
  { href: "/panel/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/panel/servicios", label: "Servicios", icon: PlatformsIcon },
  { href: "/panel/productos", label: "Productos", icon: ProductsIcon },
  { href: "/panel/mayorista", label: "Mayorista", icon: InventoryIcon },
  { href: "/panel/inventario", label: "Inventario", icon: InventoryIcon },
  { href: "/panel/pedidos", label: "Pedidos", icon: OrdersIcon },
  { href: "/panel/ventas", label: "Ventas", icon: SalesIcon },
  { href: "/panel/finanzas", label: "Finanzas", icon: FinanceIcon },
  { href: "/panel/comprobantes", label: "Comprobantes", icon: ReceiptIcon },
  { href: "/panel/correos", label: "Correos conectados", icon: MailIcon },
  { href: "/panel/acceso", label: "Centro de acceso", icon: KeyIcon },
  { href: "/panel/soporte", label: "Soporte", icon: SupportIcon },
  { href: "/panel/usuarios-clientes", label: "Usuarios de clientes", icon: UsersIcon },
  { href: "/panel/configuracion", label: "Configuración", icon: SettingsIcon },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/vendedores", label: "Vendedores", icon: UsersIcon },
  { href: "/admin/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/admin/pedidos", label: "Pedidos", icon: OrdersIcon },
  { href: "/admin/servicios", label: "Servicios", icon: PlatformsIcon },
  { href: "/admin/plataformas", label: "Plataformas", icon: ProductsIcon },
  { href: "/admin/inventario", label: "Inventario", icon: InventoryIcon },
  { href: "/admin/proveedores", label: "Proveedores", icon: InventoryIcon },
  { href: "/admin/correos", label: "Correos", icon: MailIcon },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: SupportIcon },
  { href: "/admin/finanzas", label: "Finanzas", icon: FinanceIcon },
  { href: "/admin/reportes", label: "Reportes", icon: ReportIcon },
  { href: "/admin/historial", label: "Historial", icon: HistoryIcon },
  { href: "/admin/configuracion", label: "Configuración", icon: SettingsIcon },
];

export const customerNav: NavItem[] = [
  { href: "/cliente", label: "Inicio", icon: HomeIcon },
  { href: "/cliente/comprar", label: "Comprar", icon: ProductsIcon },
  { href: "/cliente/servicios", label: "Mis servicios", icon: PlatformsIcon },
  { href: "/cliente/pedidos", label: "Mis pedidos", icon: OrdersIcon },
  { href: "/cliente/acceso", label: "Centro de acceso", icon: KeyIcon },
  { href: "/cliente/soporte", label: "Soporte", icon: SupportIcon },
  { href: "/cliente/cuenta", label: "Mi cuenta", icon: SettingsIcon },
];
