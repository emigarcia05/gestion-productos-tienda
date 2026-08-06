/**
 * Rutas canónicas del módulo Estadísticas Productos (área **Administración**).
 * Prefijo: `/estadisticas-productos/{submódulo}`.
 */

export const ESTADISTICAS_PRODUCTOS_ROUTES = {
  defaultEntry: "/estadisticas-productos/ventas-por-producto",
  ventasPorProducto: "/estadisticas-productos/ventas-por-producto",
  categorizacion: "/estadisticas-productos/categorizacion",
  estadisticasVtas: "/estadisticas-productos/estadisticas-vtas",
} as const;
