/**
 * Rutas canónicas del área Estadísticas Productos.
 * Prefijo: `/estadisticas-productos/{submódulo}`.
 */

export const ESTADISTICAS_PRODUCTOS_ROUTES = {
  defaultEntry: "/estadisticas-productos/ventas-por-producto",
  ventasPorProducto: "/estadisticas-productos/ventas-por-producto",
  categorizacion: "/estadisticas-productos/categorizacion",
} as const;
