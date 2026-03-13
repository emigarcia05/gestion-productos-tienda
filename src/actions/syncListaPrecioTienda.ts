"use server";

import { esEditor } from "@/lib/sesion";
import { syncListaPrecioTiendaFromDux } from "@/services/syncListaPrecioTienda.service";

export type SyncListaPrecioTiendaResult = Awaited<
  ReturnType<typeof syncListaPrecioTiendaFromDux>
>;

/**
 * Sincroniza lista_precios_tienda desde la API DUX ERP.
 * Solo usuarios con rol editor. Ejecuta el bucle paginado (50 ítems/petición), mapeo, upsert por lotes y delay.
 * Los logs de progreso se escriben en la consola del servidor.
 */
export async function sincronizarListaPrecioTiendaDux(): Promise<SyncListaPrecioTiendaResult> {
  if (!(await esEditor())) {
    return {
      creados: 0,
      actualizados: 0,
      totalProcesados: 0,
      totalApi: 0,
      duracionMs: 0,
      errores: ["Sin permisos de editor."],
    };
  }
  return syncListaPrecioTiendaFromDux();
}
