/**
 * Genera un código único de 4 caracteres alfanuméricos en mayúsculas.
 * Ejemplo: "A3FX", "9KPQ"
 */
export function generarCodigoUnico(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * Construye el codExt combinando el sufijo del proveedor
 * con el código de producto del proveedor.
 * Ejemplo: "PIN-PRD001"
 */
export function buildCodExt(sufijo: string, codProdProv: string): string {
  return `${sufijo.toUpperCase()}-${codProdProv.trim().toUpperCase()}`;
}
