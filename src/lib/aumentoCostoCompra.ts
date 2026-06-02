/**
 * Aumento de costo de compra: Costo Nuevo (proveedor vinculado) vs Costo Viejo (tienda/DUX).
 * Fórmula: ((Costo Nuevo / Costo Viejo) − 1) × 100
 */

export function calcAumentoPctCostoCompra(
  costoNuevo: number,
  costoViejo: number
): number | null {
  if (!(costoViejo > 0) || !(costoNuevo > 0)) return null;
  return ((costoNuevo / costoViejo) - 1) * 100;
}

/** Ítem reportable si el costo en pesos (entero) difiere entre proveedor y tienda. */
export function costosCompraDifierenParaInforme(
  costoViejo: number,
  costoNuevo: number
): boolean {
  return Math.round(costoViejo) !== Math.round(costoNuevo);
}
