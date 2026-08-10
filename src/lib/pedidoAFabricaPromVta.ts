/**
 * Cálculo de **PROM. VTA.** (Pedido A Fáb.).
 *
 * Ventas de los **2 meses calendario completos** anteriores al mes actual (AR),
 * divididas por **48** (24 días de venta × 2 meses) y redondeadas al entero.
 */

import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import { etiquetaMesEstPorProd } from "@/lib/estPorProdPeriodo";

/** Días de venta contables por mes. */
export const PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES = 24;

/** Cantidad de meses previos completos que entran en el promedio. */
export const PEDIDO_A_FABRICA_MESES_PROM_VTA = 2;

/** Denominador fijo: 24 × 2 = 48. */
export const PEDIDO_A_FABRICA_DIAS_PROM_VTA =
  PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES * PEDIDO_A_FABRICA_MESES_PROM_VTA;

export type PeriodoMesAnio = { mes: number; anio: number };

export function mesAnioActualArgentinaPedidoAFabrica(
  ahora: Date = new Date()
): PeriodoMesAnio {
  const ymd = dateToIsoYmdArgentina(ahora);
  const [y, m] = ymd.split("-").map(Number);
  return { mes: m!, anio: y! };
}

export function mesAnteriorPeriodo(periodo: PeriodoMesAnio): PeriodoMesAnio {
  if (periodo.mes <= 1) return { mes: 12, anio: periodo.anio - 1 };
  return { mes: periodo.mes - 1, anio: periodo.anio };
}

/**
 * Los 2 meses completos previos al mes calendario actual (AR).
 * Ej.: en agosto → junio (anterior) y julio (reciente).
 */
export function periodosUltimosDosMesesCompletos(
  ahora: Date = new Date()
): { anterior: PeriodoMesAnio; reciente: PeriodoMesAnio; actual: PeriodoMesAnio } {
  const actual = mesAnioActualArgentinaPedidoAFabrica(ahora);
  const reciente = mesAnteriorPeriodo(actual);
  const anterior = mesAnteriorPeriodo(reciente);
  return { anterior, reciente, actual };
}

/** Etiqueta legible: «Junio 2026». */
export function etiquetaPeriodoMesAnio(p: PeriodoMesAnio): string {
  return `${etiquetaMesEstPorProd(p.mes)} ${p.anio}`;
}

/**
 * Promedio diario: total vendido en los 2 meses / 48, redondeado al entero.
 * Ej.: 220 / 48 ≈ 4,58 → 5.
 */
export function calcularPromVtaDiariaDesdeTotal(totalDosMeses: number): number {
  if (!Number.isFinite(totalDosMeses) || totalDosMeses <= 0) return 0;
  return Math.round(totalDosMeses / PEDIDO_A_FABRICA_DIAS_PROM_VTA);
}
