/** Progreso mostrado en `SyncModal` durante sincronización DUX → lista tienda. */
export interface ListaPreciosTiendaModalProgreso {
  procesados: number;
  total: number;
  /** Null hasta tener primera respuesta útil del poll. */
  segsRestantes: number | null;
  /** Fase reportada por `GET /api/sync-lista-precios-tienda/status`. */
  phase?: "sincronizando" | "guardando";
}
