import { DET_PRECIO_MANUAL } from "@/lib/pxListas";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";

/** Query `ordenMarcacion`: ordenar filas por la columna MARCACION calculada. */
export const ORDEN_MARCACION_DESC = "marcacion-desc" as const;
export const ORDEN_MARCACION_ASC = "marcacion-asc" as const;

export type OrdenMarcacionPxListas =
  | typeof ORDEN_MARCACION_DESC
  | typeof ORDEN_MARCACION_ASC
  | "";

export const OPCIONES_ORDEN_MARCACION_PX_LISTAS = [
  { value: ORDEN_MARCACION_DESC, label: "ORDENAR DE MAYOR A MENOR" },
  { value: ORDEN_MARCACION_ASC, label: "ORDENAR DE MENOR A MAYOR" },
] as const;

export function esOrdenMarcacionPxListas(
  value: string | undefined
): value is typeof ORDEN_MARCACION_DESC | typeof ORDEN_MARCACION_ASC {
  return value === ORDEN_MARCACION_DESC || value === ORDEN_MARCACION_ASC;
}

/** Query `filtroPxPromedio`: DIF TIENDA vs promedio de competidores. */
export const FILTRO_PX_PROMEDIO_MAYOR = "mayor-promedio" as const;
export const FILTRO_PX_PROMEDIO_MENOR = "menor-promedio" as const;

export type FiltroPxPromedioPxListas =
  | typeof FILTRO_PX_PROMEDIO_MAYOR
  | typeof FILTRO_PX_PROMEDIO_MENOR
  | "";

export const OPCIONES_FILTRO_PX_PROMEDIO_PX_LISTAS = [
  { value: FILTRO_PX_PROMEDIO_MAYOR, label: "MAYOR AL PROMEDIO" },
  { value: FILTRO_PX_PROMEDIO_MENOR, label: "MENOR AL PROMEDIO" },
] as const;

export function esFiltroPxPromedioPxListas(
  value: string | undefined
): value is typeof FILTRO_PX_PROMEDIO_MAYOR | typeof FILTRO_PX_PROMEDIO_MENOR {
  return value === FILTRO_PX_PROMEDIO_MAYOR || value === FILTRO_PX_PROMEDIO_MENOR;
}

export function esDetPrecioFiltroManual(detPrecio: string): boolean {
  return detPrecio === DET_PRECIO_MANUAL;
}

export function filtrarItemsPxListasEnMemoria(
  items: ItemPxListasParaTabla[],
  params: { detPrecio: string; filtroPxPromedio: FiltroPxPromedioPxListas }
): ItemPxListasParaTabla[] {
  let out = items;
  if (esDetPrecioFiltroManual(params.detPrecio)) {
    out = out.filter((item) => item.esDetPrecioManual);
  }
  if (params.filtroPxPromedio === FILTRO_PX_PROMEDIO_MAYOR) {
    out = out.filter(
      (item) =>
        item.difPctTiendaVsPromedio != null && item.difPctTiendaVsPromedio > 0
    );
  } else if (params.filtroPxPromedio === FILTRO_PX_PROMEDIO_MENOR) {
    out = out.filter(
      (item) =>
        item.difPctTiendaVsPromedio != null && item.difPctTiendaVsPromedio < 0
    );
  }
  return out;
}

export function requierePostProcesoPxListas(params: {
  ordenMarcacion: OrdenMarcacionPxListas;
  detPrecio: string;
  filtroPxPromedio: FiltroPxPromedioPxListas;
}): boolean {
  return (
    Boolean(params.ordenMarcacion) ||
    esDetPrecioFiltroManual(params.detPrecio) ||
    Boolean(params.filtroPxPromedio)
  );
}
