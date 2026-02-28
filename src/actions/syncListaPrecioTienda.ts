"use server";

import { syncListaPrecioTiendaFromDux } from "@/services/syncListaPrecioTienda.service";

export type SyncListaPrecioTiendaResult = Awaited<
  ReturnType<typeof syncListaPrecioTiendaFromDux>
>;

/**
 * Sincroniza lista_precios_tienda desde la API DUX ERP.
 * Ejecuta el bucle paginado (50 ítems/petición), mapeo, upsert por lotes y delay 1s.
 * Los logs de progreso se escriben en la consola del servidor.
 */
export async function sincronizarListaPrecioTiendaDux(): Promise<SyncListaPrecioTiendaResult> {
  return syncListaPrecioTiendaFromDux();
}
