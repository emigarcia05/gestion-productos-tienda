/** Tipos de hechos de publicación (`mkt_publi`) para el calendario. */

export type MktPublicacionCalendarioItem = {
  id: string;
  /** Día de calendario `YYYY-MM-DD`. */
  fechaIso: string;
  publicacion: string;
  /** SI = true / NO = false. */
  contenidoCreado: boolean;
  redId: string;
  redNombre: string;
  tipoPublicacionId: string;
  tipoPublicacionNombre: string;
  tipoContenidoId: string;
  tipoContenidoNombre: string;
  /** Idea de detalle vinculada (`mkt_publi_ideas_detalle`), si existe. */
  ideaDetalleId: string | null;
  /** Sección de la idea vinculada. */
  ideaSeccionId: string | null;
};
