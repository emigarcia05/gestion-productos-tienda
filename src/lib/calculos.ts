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

/** Divisor IVA 21 % para px de venta en Comp. Categorias — MARGEN (SEGÚN PX REFERENCIA). */
const IVA_PX_VENTA_REFERENCIA_DIVISOR = 1.21;

/**
 * Comp. Categorias — **MARGEN (SEGÚN PX REFERENCIA)**:
 * `(((pxVtaReferencia / 1.21) / costo) − 1) × 100`
 * - `pxVtaReferencia`: px de venta del producto referido (competencia).
 * - `costo`: `px_compra_final_sin_iva` de la fila analizada.
 */
export function calcMargenSegunPxReferencia(
  pxVtaReferencia: number | null | undefined,
  costoCompraSinIva: number | null | undefined
): number | null {
  if (pxVtaReferencia == null || costoCompraSinIva == null) return null;
  if (!(pxVtaReferencia > 0) || !(costoCompraSinIva > 0)) return null;
  if (!Number.isFinite(pxVtaReferencia) || !Number.isFinite(costoCompraSinIva)) return null;
  return ((pxVtaReferencia / IVA_PX_VENTA_REFERENCIA_DIVISOR / costoCompraSinIva) - 1) * 100;
}

/** Dif. % entera: px manual vs px de venta de referencia — `round((manual − ref) / ref × 100)`. */
export function calcDifPctPxManualVsReferencia(
  pxManual: number | null | undefined,
  pxVtaReferencia: number | null | undefined
): number | null {
  if (pxManual == null || pxVtaReferencia == null) return null;
  if (!(pxManual > 0) || !(pxVtaReferencia > 0)) return null;
  if (!Number.isFinite(pxManual) || !Number.isFinite(pxVtaReferencia)) return null;
  return Math.round(((pxManual - pxVtaReferencia) / pxVtaReferencia) * 100);
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
  return Math.round(px);
}

/** Redondeo estándar de precio lista tienda (4 decimales, alineado a Prisma DECIMAL(14,4)). */
export function roundPrecioListaTienda(value: number): number {
  return Math.round(value * 10000) / 10000;
}
