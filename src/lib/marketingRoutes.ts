/**
 * Rutas canónicas del área Marketing.
 * Prefijo: `/marketing/{módulo}/{submódulo}`.
 */

export const MARKETING_ROUTES = {
  defaultEntry: "/marketing/publicaciones/calendario",
  publicaciones: {
    calendario: "/marketing/publicaciones/calendario",
    ideas: "/marketing/publicaciones/ideas",
  },
} as const;
