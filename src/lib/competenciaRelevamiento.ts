/** Estados de `prod_precios_competencia.estado` (vínculo producto × competidor). */
export const ESTADO_RELEVAMIENTO_COMPETENCIA = {
  SIN_URL: "SIN_URL",
  PENDIENTE: "PENDIENTE",
  OK: "OK",
  SIN_PRECIO: "SIN_PRECIO",
  ERROR: "ERROR",
} as const;

export type EstadoRelevamientoCompetencia =
  (typeof ESTADO_RELEVAMIENTO_COMPETENCIA)[keyof typeof ESTADO_RELEVAMIENTO_COMPETENCIA];

export const ESTADOS_RELEVAMIENTO_FILTRO = [
  { value: "", label: "TODOS" },
  { value: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL, label: "SIN URL" },
  { value: ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE, label: "PENDIENTE" },
  { value: ESTADO_RELEVAMIENTO_COMPETENCIA.OK, label: "OK" },
  { value: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO, label: "SIN PRECIO" },
  { value: ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR, label: "ERROR" },
] as const;

export function etiquetaEstadoRelevamiento(estado: string | null | undefined): string {
  switch (estado) {
    case ESTADO_RELEVAMIENTO_COMPETENCIA.OK:
      return "OK";
    case ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO:
      return "Sin Precio";
    case ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR:
      return "Error";
    case ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE:
      return "Pendiente";
    case ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL:
      return "Sin URL";
    default:
      return "Sin URL";
  }
}
