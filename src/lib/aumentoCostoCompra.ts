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
