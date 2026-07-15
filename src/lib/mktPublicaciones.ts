/** Tipos de hechos de publicación (`mkt_publi`) para el calendario. */

export type MktPublicacionCalendarioItem = {
  id: string;
  /** Día de calendario `YYYY-MM-DD`. */
  fechaIso: string;
  publicacion: string;
  /** URL de Drive; vacío = sin contenido creado. */
  contenidoUrl: string;
  /** Derivado: `contenidoUrl` no vacío. */
  contenidoCreado: boolean;
  redId: string;
  redNombre: string;
  tipoContenidoId: string;
  tipoContenidoNombre: string;
  /** Idea de detalle vinculada (`mkt_publi_ideas_detalle`), si existe. */
  ideaDetalleId: string | null;
  /** Sección de la idea vinculada. */
  ideaSeccionId: string | null;
};

/** `contenido_creado` se deriva de `contenido_url`. */
export function mktContenidoCreadoDesdeUrl(contenidoUrl: string): boolean {
  return contenidoUrl.trim().length > 0;
}
