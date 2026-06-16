"use server";

import { revalidatePath } from "next/cache";
import {
  actualizarListaPreciosMasivo,
  getListaPreciosConTiendaFiltrada,
  getProveedoresDisponiblesListaPrecios,
  getMarcasDisponiblesListaPrecios,
  getRubrosDisponiblesListaPrecios,
  listarListaPreciosFiltradaParaExport,
  type FilaListaPrecioParaCliente,
} from "@/services/listaPrecios.service";
import type { ActionResult } from "@/lib/types";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { z } from "zod";
import {
  listaPreciosCodExtListSchema,
  actualizacionMasivaListaPreciosSchema,
  listaPreciosFiltrosLecturaSchema,
  listaPreciosFiltrosExportSchema,
} from "@/lib/validations/listaPrecios";

export type { ActualizacionMasivaListaPrecios, FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";
export type { ListaPreciosFiltrosLecturaInput, ListaPreciosFiltrosExportInput } from "@/lib/validations/listaPrecios";

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
  raw: unknown
): Promise<ListaPreciosConOpcionesResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return listaPreciosConOpcionesVacio;
  }
  const parsed = listaPreciosFiltrosLecturaSchema.safeParse(raw);
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
  try {
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
  } catch {
    return listaPreciosConOpcionesVacio;
  }
}

/**
 * Exporta todos los ítems que coinciden con los filtros activos (sin paginación).
 * Misma regla de filtros que la grilla (`getListaPreciosConOpcionesAction`).
 */
export async function exportarListaPreciosAction(
  raw: unknown
): Promise<ActionResult<{ filas: FilaListaPrecioParaCliente[] }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return { ok: false, error: "Sin permisos para exportar la lista de precios." };
  }

  const parsed = listaPreciosFiltrosExportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Filtros inválidos para exportar." };
  }

  const {
    proveedorId: prov,
    marcaNombre: marca,
    rubroNombre: rubro,
    busqueda: q,
    habilitado: hab,
    opciones: opt,
  } = parsed.data;

  const provTrim = prov?.trim() || undefined;
  const marcaTrim = marca?.trim() || undefined;
  const rubroTrim = rubro?.trim() || undefined;
  const qTrim = q?.trim() || undefined;

  const tieneFiltro =
    !!provTrim ||
    !!marcaTrim ||
    !!rubroTrim ||
    hab !== undefined ||
    (qTrim?.length ?? 0) >= 3;

  if (!tieneFiltro) {
    return {
      ok: false,
      error: "Aplicá un filtro o escribí al menos 3 caracteres en la búsqueda para exportar.",
    };
  }

  try {
    const filas = await listarListaPreciosFiltradaParaExport(
      provTrim,
      marcaTrim,
      rubroTrim,
      qTrim,
      hab,
      opt
    );
    return { ok: true, data: { filas } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "No se pudo exportar la lista de precios.";
    return { ok: false, error: message };
  }
}

/**
 * Edición masiva: actualiza Desc. rubro, Desc. cant. y/o Cx. aprox. transporte
 * en los registros de prod_precios_provee cuyos id están en ids.
 * Solo usuarios con permiso listaPrecios.acciones.edicionMasiva.
 */
const actualizarListaPreciosMasivoPayloadSchema = z.object({
  ids: listaPreciosCodExtListSchema,
  data: actualizacionMasivaListaPreciosSchema,
});

export async function actualizarListaPreciosMasivoAction(
  raw: unknown
): Promise<ActionResult<{ actualizados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsed = actualizarListaPreciosMasivoPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  try {
    const result = await actualizarListaPreciosMasivo(parsed.data.ids, parsed.data.data);
    if (result.error) return { ok: false, error: result.error };
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: { actualizados: result.actualizados } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar la lista de precios.";
    return { ok: false, error: message };
  }
}
