/**
 * Rutas canónicas del área Marketing.
 * Prefijo: `/marketing/{módulo}/{submódulo?}`.
 */

export const MARKETING_ROUTES = {
  defaultEntry: "/marketing/publicaciones/calendario",
  publicaciones: {
    calendario: "/marketing/publicaciones/calendario",
    ideas: "/marketing/publicaciones/ideas",
    objetivos: "/marketing/publicaciones/objetivos",
  },
  baseMultimedia: {
    contenido: "/marketing/base-multimedia",
    coloresMarca: "/marketing/base-multimedia/colores-marca",
  },
} as const;
