/**
 * Rutas canónicas del área Marketing.
 * Prefijo: `/marketing/{módulo}/{submódulo?}`.
 */

export const MARKETING_ROUTES = {
  defaultEntry: "/marketing/publicaciones/calendario",
  publicaciones: {
    calendario: "/marketing/publicaciones/calendario",
    ideas: "/marketing/publicaciones/ideas",
  },
  baseMultimedia: {
    contenido: "/marketing/base-multimedia",
    coloresMarca: "/marketing/base-multimedia/colores-marca",
  },
} as const;

/** @deprecated Usar `MARKETING_ROUTES.baseMultimedia.contenido`. */
export const MARKETING_ROUTE_BASE_MULTIMEDIA_LEGACY =
  MARKETING_ROUTES.baseMultimedia.contenido;
