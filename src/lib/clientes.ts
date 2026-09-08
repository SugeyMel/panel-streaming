export function whatsappParaMostrar(valor: string | null | undefined): string {
  const digits = String(valor ?? "").replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length >= 11) {
    return digits.slice(2, 11);
  }
  return digits.slice(0, 9);
}

export function whatsappParaGuardar(valor: string): string {
  const local = whatsappParaMostrar(valor);
  if (local.length !== 9) return "";
  return `51${local}`;
}

export type PerfilAgrupable = {
  id: string;
  clienteTelefono: string | null;
  clienteNombre: string | null;
};

export type ClienteAgrupado<T extends PerfilAgrupable = PerfilAgrupable> = {
  nombre: string | null;
  servicios: Set<string>;
  perfiles: T[];
};

export function agruparClientesPorServicios<T extends PerfilAgrupable>(
  cuentas: Array<{ servicio: string; perfiles: T[] }>,
): Map<string, ClienteAgrupado<T>> {
  const grupos = new Map<string, ClienteAgrupado<T>>();

  for (const cuenta of cuentas) {
    for (const perfil of cuenta.perfiles) {
      if (!perfil.clienteTelefono) continue;
      const telefono = whatsappParaMostrar(perfil.clienteTelefono);
      if (!telefono) continue;

      const actual = grupos.get(telefono);
      if (actual) {
        actual.servicios.add(cuenta.servicio);
        actual.perfiles.push(perfil);
        if (!actual.nombre && perfil.clienteNombre) actual.nombre = perfil.clienteNombre;
        continue;
      }

      grupos.set(telefono, {
        nombre: perfil.clienteNombre,
        servicios: new Set([cuenta.servicio]),
        perfiles: [perfil],
      });
    }
  }

  return grupos;
}
