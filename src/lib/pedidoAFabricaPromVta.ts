/**
 * Cálculo de **PROM. VTA.** (Pedido A Fáb.).
 *
 * Ventas de los **2 meses calendario completos** anteriores al mes actual (AR),
 * divididas por **48** (24 días de venta × 2 meses) y redondeadas **siempre hacia arriba** (techo).
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
 * Promedio diario: total vendido en los 2 meses / 48, redondeo **hacia arriba**.
 * Ej.: 1,01 → 2; 1,99 → 2; 2,01 → 3; 65/48 ≈ 1,35 → 2; 40/48 ≈ 0,83 → 1.
 * Si el cociente es entero exacto, se conserva (p. ej. 96/48 → 2).
 */
export function calcularPromVtaDiariaDesdeTotal(totalDosMeses: number): number {
  if (!Number.isFinite(totalDosMeses) || totalDosMeses <= 0) return 0;
  return Math.ceil(totalDosMeses / PEDIDO_A_FABRICA_DIAS_PROM_VTA);
}

/**
 * Stock actual expresado en días de venta: stock / prom. vta. diario.
 * `null` si no hay promedio positivo.
 */
export function calcularStockEnDiasPedidoAFabrica(
  stockActual: number | null | undefined,
  promVta: number | null | undefined
): number | null {
  if (
    stockActual == null ||
    promVta == null ||
    !Number.isFinite(stockActual) ||
    !Number.isFinite(promVta) ||
    promVta <= 0
  ) {
    return null;
  }
  return Math.round(stockActual / promVta);
}

export type InputsCantSugeridaPedidoAFabrica = {
  /** Stock actual total (suma sucursales `pedido`). */
  stockActual: number;
  /** Promedio de venta diario total (suma sucursales). */
  promVtaTotal: number;
  /** Días de entrega del proveedor (`tiempo_entrega_en_dias`); null/undefined → 0. */
  tiempoEntregaEnDias: number | null | undefined;
  /** Días de stockeo (filtro **TIEMPO STOCKEO**); null/undefined/negativo → sin cálculo. */
  tiempoStockeo: number | null | undefined;
};

export type ResultadoCantSugeridaPedidoAFabrica = {
  /** Stock proyectado al llegar el pedido: stock − (entrega × prom). */
  stockAFechaLlegadaPedido: number;
  /** Cobertura deseada al stockear: stockeo × prom. */
  stockParaTiempoStockeo: number;
  /**
   * Cantidad sugerida a pedir (≥ 0, redondeada).
   * Si stock a llegada ≤ 0 → stock para stockeo;
   * si stock a llegada > 0 → stockeo − stock a llegada (piso 0).
   */
  cantSugerida: number;
};

/**
 * Cant. sugerida Pedido A Fáb. (TOTAL).
 *
 * - Fecha Llegada Pedido = hoy + `tiempo_entrega_en_dias`
 * - Fecha Stockeo = Fecha Llegada + Tiempo Stockeo
 * - Stock a Fecha Llegada = Stock Actual − (entrega × prom vta. total)
 * - Stock Para Tiempo Stockeo = Tiempo Stockeo × prom vta. total
 */
export function calcularCantSugeridaPedidoAFabrica(
  input: InputsCantSugeridaPedidoAFabrica
): ResultadoCantSugeridaPedidoAFabrica | null {
  const { stockActual, promVtaTotal, tiempoEntregaEnDias, tiempoStockeo } =
    input;

  if (
    tiempoStockeo == null ||
    !Number.isFinite(tiempoStockeo) ||
    tiempoStockeo < 0 ||
    !Number.isFinite(stockActual) ||
    !Number.isFinite(promVtaTotal)
  ) {
    return null;
  }

  const entrega =
    tiempoEntregaEnDias != null && Number.isFinite(tiempoEntregaEnDias)
      ? Math.max(0, tiempoEntregaEnDias)
      : 0;
  const stockeo = Math.max(0, tiempoStockeo);
  const prom = Math.max(0, promVtaTotal);
  const stock = Math.max(0, stockActual);

  const stockAFechaLlegadaPedido = stock - entrega * prom;
  const stockParaTiempoStockeo = stockeo * prom;

  const crudo =
    stockAFechaLlegadaPedido <= 0
      ? stockParaTiempoStockeo
      : stockParaTiempoStockeo - stockAFechaLlegadaPedido;

  return {
    stockAFechaLlegadaPedido,
    stockParaTiempoStockeo,
    cantSugerida: Math.max(0, Math.round(crudo)),
  };
}
