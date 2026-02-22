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
 * Construye el codExt combinando el codigoUnico del proveedor
 * con el código de producto del proveedor.
 * Ejemplo: "A3FX-PRD001"
 */
export function buildCodExt(codigoUnico: string, codProdProv: string): string {
  return `${codigoUnico.toUpperCase()}-${codProdProv.trim().toUpperCase()}`;
}
