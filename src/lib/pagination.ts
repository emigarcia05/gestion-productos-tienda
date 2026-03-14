/**
 * Paginación estándar de tablas en la app.
 * Todas las tablas muestran 100 ítems por página; al superar ese número se muestran controles de paginación.
 */

export const PAGE_SIZE = 100;

export function totalPaginasFromTotal(total: number, pageSize: number = PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function skipForPagina(pagina: number, pageSize: number = PAGE_SIZE): number {
  const p = Math.max(1, pagina);
  return (p - 1) * pageSize;
}
