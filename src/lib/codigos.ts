/**
 * Construye el codExt combinando el prefijo del proveedor
 * con el código de producto del proveedor.
 * Ejemplo: "PIN-PRD001"
 */
export function buildCodExt(prefijo: string, codProdProv: string): string {
  return `${prefijo.toUpperCase()}-${codProdProv.trim().toUpperCase()}`;
}
