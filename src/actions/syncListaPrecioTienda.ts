"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return {
      creados: 0,
      actualizados: 0,
      totalProcesados: 0,
      totalApi: 0,
      duracionMs: 0,
      errores: ["Sin permisos para sincronizar la lista de precios tienda."],
    };
  }
  return syncListaPrecioTiendaFromDux();
}
