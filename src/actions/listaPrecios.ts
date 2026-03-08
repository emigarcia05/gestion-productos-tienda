"use server";

import { revalidatePath } from "next/cache";
import {
  actualizarListaPreciosMasivo,
  getListaPreciosConTiendaFiltrada,
  getProveedoresDisponiblesListaPrecios,
  getMarcasDisponiblesListaPrecios,
  type ActualizacionMasivaListaPrecios,
  type FilaListaPrecioParaCliente,
  type ListaPreciosFiltradoOpciones,
} from "@/services/listaPrecios.service";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export type { ActualizacionMasivaListaPrecios, FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

/**
 * Devuelve lista de precios filtrada por proveedor, marca y/o búsqueda (≥3 caracteres).
 * Para carga bajo demanda: el cliente solo llama cuando hay filtro activo.
 */
export async function getListaPreciosFiltradaAction(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  busqueda: string | undefined
): Promise<FilaListaPrecioParaCliente[]> {
  return getListaPreciosConTiendaFiltrada(proveedorId, marcaNombre, busqueda);
}

export interface ListaPreciosConOpcionesResult {
  filas: FilaListaPrecioParaCliente[];
  proveedoresDisponibles: { id: string; nombre: string; prefijo: string }[];
  marcasDisponibles: { id: string; nombre: string }[];
}

/**
 * Lista de precios filtrada + opciones dinámicas para Proveedor y Marca según el resto de filtros.
 * opciones.soloPxSugerido: solo ítems con px_vta_sugerido no nulo (p. ej. página Px Vta. Sugeridos).
 */
export async function getListaPreciosConOpcionesAction(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  busqueda: string | undefined,
  opciones?: ListaPreciosFiltradoOpciones
): Promise<ListaPreciosConOpcionesResult> {
  const prov = proveedorId?.trim() || undefined;
  const marca = marcaNombre?.trim() || undefined;
  const q = busqueda?.trim() || undefined;
  const [filas, proveedoresDisponibles, marcasDisponibles] = await Promise.all([
    getListaPreciosConTiendaFiltrada(prov, marca, q, opciones),
    getProveedoresDisponiblesListaPrecios(marca, q, opciones),
    getMarcasDisponiblesListaPrecios(prov, q, opciones),
  ]);
  return { filas, proveedoresDisponibles, marcasDisponibles };
}

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
