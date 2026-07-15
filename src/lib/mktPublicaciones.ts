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
  /** Redes N:M (`mkt_publi_redes`); mín. 1. */
  redIds: string[];
  /** Nombres de red en el mismo orden que `redIds`. */
  redesNombres: string[];
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

/** Cuenta cuántas publicaciones incluyen la red (1 por publicación×red). */
export function contarPublicacionesConRed(
  publicaciones: ReadonlyArray<{ redIds: string[] }>,
  redId: string
): number {
  let n = 0;
  for (const p of publicaciones) {
    if (p.redIds.includes(redId)) n += 1;
  }
  return n;
}
