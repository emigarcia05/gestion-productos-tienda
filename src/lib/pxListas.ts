import { calcMargenSinIvaPct } from "@/lib/calculos";
import type {
  CompetidorFalloRelevamientoFila,
  CompetidorPrecioFila,
} from "@/lib/competenciaPreciosFilaResumen";
import type { VinculoCompetenciaPxListas } from "@/lib/pxListasVinculos";

/** Valor del select DET PRECIO cuando el precio es manual. */
export const DET_PRECIO_MANUAL = "manual" as const;

export type DetPrecioSeleccion = typeof DET_PRECIO_MANUAL | string;

export type OpcionCompetenciaPxLista = {
  competenciaId: string;
  nombre: string;
  px: number | null;
};

export type ItemPxListasParaTabla = {
  id: string;
  codItem: string;
  descripcion: string;
  costoCompra: number;
  detPrecioSeleccion: DetPrecioSeleccion;
  opcionesCompetencia: OpcionCompetenciaPxLista[];
  /** `px_vta_sugerido` del proveedor vinculado (lectura; ver `buildMapPxVtaSugeridoPorCodTienda`). */
  pxPrecioSugerido: number | null;
  pxLista: number | null;
  pxListaManual: number | null;
  marcacion: number | null;
  esDetPrecioManual: boolean;
  /** Promedio de todos los competidores con precio (scraping o Px Sugerido); DIF vs PX LISTA de la fila. */
  pxPromedio: number | null;
  difPctTiendaVsPromedio: number | null;
  /** Precalculado en servidor para grilla (serializable). */
  competidoresPrecioDetalle: CompetidorPrecioFila[];
  competidoresFalloDetalle: CompetidorFalloRelevamientoFila[];
  /** Vínculos por competidor (array para RSC → cliente). */
  vinculosCompetencia: VinculoCompetenciaPxListas[];
};

/** Decimales visibles de la columna MARCACION en Px Listas. */
export const PX_LISTAS_MARCACION_DECIMALES = 5;

export function roundMarcacionPxLista(value: number): number {
  const factor = 10 ** PX_LISTAS_MARCACION_DECIMALES;
  return Math.round(value * factor) / factor;
}

/**
 * Marcación Px Listas: % utilidad sin IVA — ((px/costo)/1,21 − 1)×100.
 * Antes se persistía el factor multiplicador (px/costo/1,21); migración 20260528260000.
 */
export function calcMarcacionPxLista(pxLista: number, costoCompra: number): number | null {
  const m = calcMargenSinIvaPct(pxLista, costoCompra);
  if (m == null) return null;
  return roundMarcacionPxLista(m);
}

/** Inversa de `calcMarcacionPxLista`: PX LISTA entero en pesos. */
export function calcPxListaDesdeMarcacionPxLista(
  marcacion: number,
  costoCompra: number
): number | null {
  if (!Number.isFinite(marcacion) || !Number.isFinite(costoCompra)) return null;
  if (!(costoCompra > 0)) return null;
  const factor = 1 + marcacion / 100;
  if (!(factor > 0)) return null;
  const px = factor * costoCompra * 1.21;
  if (!Number.isFinite(px) || px <= 0) return null;
  return Math.round(px);
}

export function fmtMarcacionPxLista(pxLista: number | null, costoCompra: number): string {
  if (pxLista == null) return "—";
  const m = calcMarcacionPxLista(pxLista, costoCompra);
  if (m == null) return "—";
  return m.toLocaleString("es-AR", {
    minimumFractionDigits: PX_LISTAS_MARCACION_DECIMALES,
    maximumFractionDigits: PX_LISTAS_MARCACION_DECIMALES,
  });
}
