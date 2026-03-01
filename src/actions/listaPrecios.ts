"use server";

import { revalidatePath } from "next/cache";
import { actualizarListaPreciosMasivo, type ActualizacionMasivaListaPrecios } from "@/services/listaPrecios.service";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export type { ActualizacionMasivaListaPrecios } from "@/services/listaPrecios.service";

/**
 * Edición masiva: actualiza Desc. prod., Desc. cant. y/o Cx. aprox. transporte
 * en los registros de lista_precios_proveedores cuyos id están en ids.
 * Solo usuarios con permiso listaPrecios.acciones.edicionMasiva.
 */
export async function actualizarListaPreciosMasivoAction(
  ids: string[],
  data: ActualizacionMasivaListaPrecios
): Promise<{ ok: boolean; actualizados?: number; error?: string }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const result = await actualizarListaPreciosMasivo(ids, data);
  if (result.error) return { ok: false, error: result.error };
  revalidatePath("/proveedores/lista-precios");
  return { ok: true, actualizados: result.actualizados };
}
