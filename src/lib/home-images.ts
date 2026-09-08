export const HOME_IMAGE_SLOTS = [
  "hero",
  "tienda",
  "clientes",
  "reportes",
  "correos",
  "inventario",
  "pagos",
  "pedidos",
  "configuracion",
] as const;

export type HomeImageSlot = (typeof HOME_IMAGE_SLOTS)[number];

export type HomeImage = {
  slot: HomeImageSlot;
  storagePath: string;
  url: string;
};

export type HomeImagesMap = Partial<Record<HomeImageSlot, HomeImage>>;

export function isHomeImageSlot(value: string): value is HomeImageSlot {
  return (HOME_IMAGE_SLOTS as readonly string[]).includes(value);
}

export const HOME_SLOT_META: Record<
  HomeImageSlot,
  { label: string; recommended: string; fallback: string }
> = {
  hero: {
    label: "Portada principal",
    recommended: "1600×400 px · horizontal · máx. 8 MB",
    fallback: "from-[#1e1b4b] via-[#312e81] to-[#0f172a]",
  },
  tienda: {
    label: "Tienda de productos",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#9d174d] to-[#4c1d95]",
  },
  clientes: {
    label: "Clientes",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#5b21b6] to-[#1e3a8a]",
  },
  correos: {
    label: "Correos",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#0e7490] to-[#155e75]",
  },
  inventario: {
    label: "Inventario",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#b45309] to-[#7c2d12]",
  },
  pagos: {
    label: "Medios de pago",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#1d4ed8] to-[#1e3a8a]",
  },
  pedidos: {
    label: "Pedidos",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#b91c1c] to-[#7f1d1d]",
  },
  reportes: {
    label: "Vendedores",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#7e22ce] to-[#4c1d95]",
  },
  configuracion: {
    label: "Configuración",
    recommended: "800×800 px · cuadrado · máx. 8 MB",
    fallback: "from-[#334155] to-[#1e293b]",
  },
};
