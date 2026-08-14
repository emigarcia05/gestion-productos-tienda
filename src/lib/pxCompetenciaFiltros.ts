import type { ItemPxCompetenciaTabla } from "@/lib/pxCompetencia";

/** Query `filtroPxPromedio`: DIF TIENDA vs promedio de competidores. */
export const FILTRO_PX_PROMEDIO_MAYOR = "mayor-promedio" as const;
export const FILTRO_PX_PROMEDIO_MENOR = "menor-promedio" as const;

export type FiltroPxPromedioCompetencia =
  | typeof FILTRO_PX_PROMEDIO_MAYOR
  | typeof FILTRO_PX_PROMEDIO_MENOR
  | "";

export const OPCIONES_FILTRO_PX_PROMEDIO_COMPETENCIA = [
  { value: FILTRO_PX_PROMEDIO_MAYOR, label: "MAYOR AL PROMEDIO" },
  { value: FILTRO_PX_PROMEDIO_MENOR, label: "MENOR AL PROMEDIO" },
] as const;

export function esFiltroPxPromedioCompetencia(
  value: string | undefined
): value is typeof FILTRO_PX_PROMEDIO_MAYOR | typeof FILTRO_PX_PROMEDIO_MENOR {
  return value === FILTRO_PX_PROMEDIO_MAYOR || value === FILTRO_PX_PROMEDIO_MENOR;
}

export function filtrarItemsPxCompetenciaEnMemoria(
  items: ItemPxCompetenciaTabla[],
  params: { filtroPxPromedio: FiltroPxPromedioCompetencia }
): ItemPxCompetenciaTabla[] {
  if (params.filtroPxPromedio === FILTRO_PX_PROMEDIO_MAYOR) {
    return items.filter(
      (item) =>
        item.difPctTiendaVsPromedio != null && item.difPctTiendaVsPromedio > 0
    );
  }
  if (params.filtroPxPromedio === FILTRO_PX_PROMEDIO_MENOR) {
    return items.filter(
      (item) =>
        item.difPctTiendaVsPromedio != null && item.difPctTiendaVsPromedio < 0
    );
  }
  return items;
}

export function requierePostProcesoPxCompetencia(params: {
  filtroPxPromedio: FiltroPxPromedioCompetencia;
}): boolean {
  return Boolean(params.filtroPxPromedio);
}
