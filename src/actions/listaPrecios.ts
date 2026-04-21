"use server";

import { revalidatePath } from "next/cache";
import {
  actualizarListaPreciosMasivo,
  getListaPreciosConTiendaFiltrada,
  getProveedoresDisponiblesListaPrecios,
  getMarcasDisponiblesListaPrecios,
  getRubrosDisponiblesListaPrecios,
  type ActualizacionMasivaListaPrecios,
  type FilaListaPrecioParaCliente,
  type ListaPreciosFiltradoOpciones,
} from "@/services/listaPrecios.service";
import type { ActionResult } from "@/lib/types";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  idsUuidSchema,
  actualizacionMasivaListaPreciosSchema,
  listaPreciosFiltrosLecturaSchema,
} from "@/lib/validations/listaPrecios";

export type { ActualizacionMasivaListaPrecios, FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

/**
 * Devuelve lista de precios filtrada por proveedor, marca, rubro y/o búsqueda (≥3 caracteres).
 * Para carga bajo demanda: el cliente solo llama cuando hay filtro activo.
 */
const listaPreciosLecturaVacia: FilaListaPrecioParaCliente[] = [];

export async function getListaPreciosFiltradaAction(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined
): Promise<FilaListaPrecioParaCliente[]> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return listaPreciosLecturaVacia;
  }
  const parsed = listaPreciosFiltrosLecturaSchema.safeParse({
    proveedorId,
    marcaNombre,
    rubroNombre,
    busqueda,
  });
  if (!parsed.success) return listaPreciosLecturaVacia;
  const { proveedorId: prov, marcaNombre: marca, rubroNombre: rubro, busqueda: q } = parsed.data;
  const { filas } = await getListaPreciosConTiendaFiltrada(prov, marca, rubro, q, undefined);
  return filas;
}

export interface ListaPreciosConOpcionesResult {
  filas: FilaListaPrecioParaCliente[];
  total: number;
  totalPaginas: number;
  proveedoresDisponibles: { id: string; nombre: string; prefijo: string }[];
  marcasDisponibles: { id: string; nombre: string }[];
  rubrosDisponibles: { id: string; nombre: string }[];
}

/**
 * Lista de precios filtrada + opciones dinámicas para Proveedor, Marca y Rubro.
 * Comportamiento simétrico: ver docs/FILTROS_DINAMICOS.md.
 * Cada desplegable muestra solo opciones que tengan al menos un ítem con lo seleccionado en los demás.
 * Tabla: filtrada por Proveedor + Marca + Rubro + búsqueda.
 * opciones.soloPxSugerido: solo ítems con px_vta_sugerido no nulo (p. ej. página Px Vta. Sugeridos).
 */
const listaPreciosConOpcionesVacio: ListaPreciosConOpcionesResult = {
  filas: [],
  total: 0,
  totalPaginas: 0,
  proveedoresDisponibles: [],
  marcasDisponibles: [],
  rubrosDisponibles: [],
};

export async function getListaPreciosConOpcionesAction(
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: ListaPreciosFiltradoOpciones,
  pagina?: number
): Promise<ListaPreciosConOpcionesResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return listaPreciosConOpcionesVacio;
  }
  const parsed = listaPreciosFiltrosLecturaSchema.safeParse({
    proveedorId,
    marcaNombre,
    rubroNombre,
    busqueda,
    habilitado,
    opciones,
    pagina,
  });
  if (!parsed.success) return listaPreciosConOpcionesVacio;
  const {
    proveedorId: prov,
    marcaNombre: marca,
    rubroNombre: rubro,
    busqueda: q,
    habilitado: hab,
    opciones: opt,
    pagina: pag,
  } = parsed.data;
  const provTrim = prov?.trim() || undefined;
  const marcaTrim = marca?.trim() || undefined;
  const rubroTrim = rubro?.trim() || undefined;
  const qTrim = q?.trim() || undefined;
  const [tableResult, proveedoresDisponibles, marcasDisponibles, rubrosDisponibles] = await Promise.all([
    getListaPreciosConTiendaFiltrada(provTrim, marcaTrim, rubroTrim, qTrim, hab, opt, pag),
    getProveedoresDisponiblesListaPrecios(marcaTrim, rubroTrim, qTrim, hab, opt),
    getMarcasDisponiblesListaPrecios(provTrim, rubroTrim, qTrim, hab, opt),
    getRubrosDisponiblesListaPrecios(provTrim, marcaTrim, qTrim, hab, opt),
  ]);
  return {
    filas: tableResult.filas,
    total: tableResult.total,
    totalPaginas: tableResult.totalPaginas,
    proveedoresDisponibles,
    marcasDisponibles,
    rubrosDisponibles,
  };
}

/**
 * Edición masiva: actualiza Desc. rubro, Desc. cant. y/o Cx. aprox. transporte
 * en los registros de prod_precios_provee cuyos id están en ids.
 * Solo usuarios con permiso listaPrecios.acciones.edicionMasiva.
 */
export async function actualizarListaPreciosMasivoAction(
  ids: string[],
  data: ActualizacionMasivaListaPrecios
): Promise<ActionResult<{ actualizados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsedIds = idsUuidSchema.safeParse(ids);
  if (!parsedIds.success) {
    const msg = parsedIds.error.flatten().formErrors[0] ?? parsedIds.error.message;
    return { ok: false, error: msg ?? "IDs inválidos." };
  }
  const parsedData = actualizacionMasivaListaPreciosSchema.safeParse(data);
  if (!parsedData.success) {
    const msg = parsedData.error.flatten().formErrors[0] ?? parsedData.error.message;
    return { ok: false, error: msg ?? "Datos de actualización inválidos." };
  }
  const result = await actualizarListaPreciosMasivo(parsedIds.data, parsedData.data);
  if (result.error) return { ok: false, error: result.error };
  revalidatePath("/proveedores/lista-precios");
  return { ok: true, data: { actualizados: result.actualizados } };
}
