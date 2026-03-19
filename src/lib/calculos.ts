/** Clamp de porcentaje 0–100 (para dto_*, cx_transporte). */
export function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

/**
 * Precio de compra final: todos los dto y cx_transporte son porcentajes.
 * Fórmula con descuento acumulado:
 *   precioLista × (1 - dtoTotal/100) × (1 + cxTransporte/100)
 * donde dtoTotal = dtoProveedor + dtoMarca + dtoRubro + dtoCantidad + dtoFinanciero (capado 0-100).
 * Parámetros opcionales (dtoProveedor, dtoMarca, dtoFinanciero) default 0 para compatibilidad.
 */
export function calcPxCompraFinal(
  precioLista:        number,
  dtoRubro:           number,
  dtoCantidad:        number,
  cxTransporte:       number,
  dtoProveedor:       number = 0,
  dtoMarca:           number = 0,
  dtoFinanciero:      number = 0
): number {
  const dtoTotal = clampPercent(
    dtoProveedor + dtoMarca + dtoRubro + dtoCantidad + dtoFinanciero
  );

  return (
    precioLista *
    (1 - dtoTotal / 100) *
    (1 + cxTransporte / 100)
  );
}
