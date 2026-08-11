/**
 * Rutas canónicas del módulo **Pedido A Fáb.** (área Administración).
 * Prefijo: `/pedido-a-fabrica`.
 */

export const PEDIDO_A_FABRICA_ROUTES = {
  defaultEntry: "/pedido-a-fabrica",
} as const;

/** Ruta legacy bajo Estadísticas Productos (redirect → canónica). */
export const PEDIDO_A_FABRICA_LEGACY_PATH =
  "/estadisticas-productos/est-para-compra" as const;
