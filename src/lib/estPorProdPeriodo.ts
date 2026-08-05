const MESES_TITULO: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

/** Primer periodo de la grilla Carga de Datos (inclusive). */
export const EST_POR_PROD_CARGA_DESDE = { mes: 9, anio: 2025 } as const;

export type EstPorProdPeriodo = { mes: number; anio: number };

export function etiquetaMesEstPorProd(mes: number): string {
  return MESES_TITULO[mes] ?? String(mes);
}

/** Ej.: `Septiembre 2025` */
export function etiquetaPeriodoCortoEstPorProd(mes: number, anio: number): string {
  return `${etiquetaMesEstPorProd(mes)} ${anio}`;
}

/** Ej.: `GUAYMALLÉN - ENERO - 2026` */
export function etiquetaPeriodoEstPorProd(
  nombreSucursal: string,
  mes: number,
  anio: number
): string {
  return `${nombreSucursal.trim()} - ${etiquetaMesEstPorProd(mes)} - ${anio}`.toLocaleUpperCase(
    "es-AR"
  );
}

/**
 * Periodos de la grilla Carga de Datos: desde `hasta` (mes actual) hacia atrás
 * hasta Septiembre 2025 inclusive. Primera fila = más actual.
 */
export function listarPeriodosCargaEstPorProd(
  hasta: EstPorProdPeriodo
): EstPorProdPeriodo[] {
  const out: EstPorProdPeriodo[] = [];
  let mes = hasta.mes;
  let anio = hasta.anio;
  const minMes = EST_POR_PROD_CARGA_DESDE.mes;
  const minAnio = EST_POR_PROD_CARGA_DESDE.anio;

  while (anio > minAnio || (anio === minAnio && mes >= minMes)) {
    out.push({ mes, anio });
    mes -= 1;
    if (mes < 1) {
      mes = 12;
      anio -= 1;
    }
  }
  return out;
}
