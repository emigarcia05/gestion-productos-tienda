/** Clamp de porcentaje 0–100 con hasta 2 decimales (para dto_*, cx_transporte). */
export function clampPercent(value: number): number {
  const capped = Math.max(0, Math.min(100, value));
  return Math.round(capped * 100) / 100;
}

/**
 * Precio de compra **sin IVA** (misma lógica que la columna generada `prod_precios_provee.px_compra_final_sin_iva`).
 * Todos los dto y cx_transporte son porcentajes.
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

/**
 * Marcación / margen sobre costo **sin IVA** (lista tienda neto vs costo de compra).
 * Fórmula: ((px_lista_tienda / (1 + IVA%)) / costo_compra - 1) × 100.
 * `porcIva` en puntos porcentuales (ej. 21 → divisor 1,21).
 */
export function calcMargenSinIvaPct(
  pxListaTienda: number,
  costoCompra: number,
  porcIva: number = 21
): number | null {
  if (!(costoCompra > 0) || !(pxListaTienda > 0)) return null;
  if (!Number.isFinite(pxListaTienda) || !Number.isFinite(costoCompra)) return null;
  const factorIva = 1 + porcIva / 100;
  if (!(factorIva > 0)) return null;
  const neto = pxListaTienda / factorIva;
  return ((neto / costoCompra) - 1) * 100;
}

/** Inverso de `calcMargenSinIvaPct`: PX lista con IVA desde margen % sobre costo sin IVA. */
export function calcPxListaDesdeMargenSinIvaPct(
  margenPct: number,
  costoCompra: number,
  porcIva: number = 21
): number | null {
  if (!(costoCompra > 0) || !Number.isFinite(margenPct) || !Number.isFinite(costoCompra)) {
    return null;
  }
  const factorIva = 1 + porcIva / 100;
  if (!(factorIva > 0)) return null;
  const neto = costoCompra * (1 + margenPct / 100);
  const px = neto * factorIva;
  if (!Number.isFinite(px) || px <= 0) return null;
  return Math.round(px * 10000) / 10000;
}

/** Redondeo estándar de precio lista tienda (4 decimales, alineado a Prisma DECIMAL(14,4)). */
export function roundPrecioListaTienda(value: number): number {
  return Math.round(value * 10000) / 10000;
}
