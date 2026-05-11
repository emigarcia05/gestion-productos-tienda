import type { BalanceMensualBloque } from "@/lib/balanceMensual";
import { puntoEquilibrioVentasPesos } from "@/lib/balanceMensual";

/** Filas de la grilla de balance mensual con serie temporal agregada (no un gasto individual). */
export const BALANCE_MENSUAL_FILAS_HISTORIAL_IDS = [
  "ventas",
  "cv",
  "ro",
  "cf",
  "re",
  "mc",
  "pe",
] as const;

export type BalanceMensualFilaHistorialId =
  (typeof BALANCE_MENSUAL_FILAS_HISTORIAL_IDS)[number];

export const ETIQUETA_FILA_BALANCE_HISTORIAL: Record<
  BalanceMensualFilaHistorialId,
  string
> = {
  ventas: "Ventas",
  cv: "Costo variable",
  ro: "Resultado operativo",
  cf: "Costo fijo",
  re: "Resultado del ejercicio",
  mc: "Margen contribución",
  pe: "Punto de equilibrio",
};

export function esFilaBalanceConHistorialAgregado(filaId: string): filaId is BalanceMensualFilaHistorialId {
  return (BALANCE_MENSUAL_FILAS_HISTORIAL_IDS as readonly string[]).includes(filaId);
}

/**
 * Valor numérico de la fila para el bloque (columna global o sucursal) en un mes dado.
 * `mc`: porcentaje (mismo criterio que la grilla; sin ventas → 0).
 * `pe`: pesos de punto de equilibrio o 0 si no aplica.
 */
export function montoFilaBalanceHistorial(
  filaId: BalanceMensualFilaHistorialId,
  bloque: BalanceMensualBloque,
): number {
  switch (filaId) {
    case "ventas":
      return bloque.ventas;
    case "cv":
      return bloque.costosVariables;
    case "cf":
      return bloque.costosFijos;
    case "ro":
      return bloque.resultadoOperativo;
    case "re":
      return bloque.resultadoEjercicio;
    case "mc":
      return bloque.margenContribucionPct ?? 0;
    case "pe":
      return puntoEquilibrioVentasPesos(bloque) ?? 0;
    default:
      return 0;
  }
}

/** Ventana de `cantidad` meses terminando en `(mesFin, anioFin)`, orden ascendente (más antiguo primero). */
export function ventanaMesesHastaFinAsc(
  mesFin: number,
  anioFin: number,
  cantidad: number,
): { mes: number; anio: number }[] {
  const rev: { mes: number; anio: number }[] = [];
  let m = mesFin;
  let y = anioFin;
  for (let i = 0; i < cantidad; i++) {
    rev.push({ mes: m, anio: y });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return rev.reverse();
}
