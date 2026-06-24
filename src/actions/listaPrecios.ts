"use server";

import { revalidatePath } from "next/cache";
import { REVALIDATE_LISTA_PRECIOS } from "@/lib/gestionProductosRoutes";
import {
  actualizarListaPreciosMasivo,
  crearProductoListaPrecio,
  eliminarListaPrecioProveedor,
  getListaPreciosConTiendaFiltrada,
  getProveedoresDisponiblesListaPrecios,
  getMarcasDisponiblesListaPrecios,
  getRubrosDisponiblesListaPrecios,
  listarListaPreciosFiltradaParaExport,
  type FilaListaPrecioParaCliente,
} from "@/services/listaPrecios.service";
import type { ActionResult } from "@/lib/types";
import { getRol, esEditor } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { z } from "zod";
import {
  listaPreciosCodExtListSchema,
  actualizacionMasivaListaPreciosSchema,
  listaPreciosFiltrosLecturaSchema,
  listaPreciosFiltrosExportSchema,
  crearProductoListaPrecioSchema,
  eliminarListaPrecioSchema,
} from "@/lib/validations/listaPrecios";

export type { ActualizacionMasivaListaPrecios, FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";
export type { ListaPreciosFiltrosLecturaInput, ListaPreciosFiltrosExportInput, CrearProductoListaPrecioInput } from "@/lib/validations/listaPrecios";

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
  const parsed = listaPreciosFiltrosLecturaSchema.safeParse(raw);
  if (!parsed.success) return listaPreciosConOpcionesVacio;

  const rol = await getRol();
  const soloPxSugerido = parsed.data.opciones?.soloPxSugerido === true;
  const permisoLectura = soloPxSugerido
    ? PERMISOS.proveedores.sugeridos
    : PERMISOS.proveedores.listaPrecios;
  if (!puede(rol, permisoLectura)) {
    return listaPreciosConOpcionesVacio;
  }

  const {
    proveedorId: prov,
    marcaNombre: marca,
    rubroNombre: rubro,
    busqueda: q,
    habilitado: hab,
    vinculado: vin,
    opciones: opt,
    pagina: pag,
  } = parsed.data;
  const provTrim = prov?.trim() || undefined;
  const marcaTrim = marca?.trim() || undefined;
  const rubroTrim = rubro?.trim() || undefined;
  const qTrim = q?.trim() || undefined;
  try {
    const [tableResult, proveedoresDisponibles, marcasDisponibles, rubrosDisponibles] = await Promise.all([
      getListaPreciosConTiendaFiltrada(provTrim, marcaTrim, rubroTrim, qTrim, hab, vin, opt, pag),
      getProveedoresDisponiblesListaPrecios(marcaTrim, rubroTrim, qTrim, hab, vin, opt),
      getMarcasDisponiblesListaPrecios(provTrim, rubroTrim, qTrim, hab, vin, opt),
      getRubrosDisponiblesListaPrecios(provTrim, marcaTrim, qTrim, hab, vin, opt),
    ]);
    return {
      filas: tableResult.filas,
      total: tableResult.total,
      totalPaginas: tableResult.totalPaginas,
      proveedoresDisponibles,
      marcasDisponibles,
      rubrosDisponibles,
    };
  } catch (e) {
    console.error("[getListaPreciosConOpcionesAction]", e);
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
    vinculado: vin,
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
    vin !== undefined ||
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
      vin,
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
 * Alta manual de un producto en prod_precios_provee (equivalente a una fila de import CSV).
 */
export async function crearProductoListaPrecioAction(
  raw: unknown
): Promise<ActionResult<{ codExt: string; creado: boolean }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return { ok: false, error: "Sin permisos para crear productos en la lista." };
  }
  if (!(await esEditor())) {
    return {
      ok: false,
      error: "Activá el modo editor en el sidebar (CAMBIAR USUARIO) para crear productos.",
    };
  }

  const parsed = crearProductoListaPrecioSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos inválidos para crear el producto.";
    return { ok: false, error: msg };
  }

  try {
    const result = await crearProductoListaPrecio(parsed.data);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    for (const path of REVALIDATE_LISTA_PRECIOS) {
      revalidatePath(path);
    }
    return { ok: true, data: { codExt: result.codExt, creado: result.creado } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo crear el producto.";
    return { ok: false, error: message };
  }
}

/**
 * Edición masiva: actualiza campos permitidos en `prod_precios_provee`.
 * Payload: `{ ids, data }` (fila única) o `{ filtros, data }` (todos los ítems del filtro, sin paginación).
 * Solo usuarios con permiso listaPrecios.acciones.edicionMasiva.
 */
const actualizarListaPreciosMasivoPayloadSchema = z
  .object({
    ids: listaPreciosCodExtListSchema.optional(),
    filtros: listaPreciosFiltrosExportSchema.optional(),
    data: actualizacionMasivaListaPreciosSchema,
  })
  .superRefine((val, ctx) => {
    const hasIds = (val.ids?.length ?? 0) > 0;
    const hasFiltros = val.filtros != null;
    if (!hasIds && !hasFiltros) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Se requiere ids o filtros.",
        path: ["ids"],
      });
    }
    if (hasIds && hasFiltros) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Usá solo ids o solo filtros.",
        path: ["filtros"],
      });
    }
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
    let ids: string[];
    if (parsed.data.filtros) {
      const {
        proveedorId: prov,
        marcaNombre: marca,
        rubroNombre: rubro,
        busqueda: q,
        habilitado: hab,
        vinculado: vin,
        opciones: opt,
      } = parsed.data.filtros;

      const provTrim = prov?.trim() || undefined;
      const marcaTrim = marca?.trim() || undefined;
      const rubroTrim = rubro?.trim() || undefined;
      const qTrim = q?.trim() || undefined;

      const tieneFiltro =
        !!provTrim ||
        !!marcaTrim ||
        !!rubroTrim ||
        hab !== undefined ||
        vin !== undefined ||
        (qTrim?.length ?? 0) >= 3;

      if (!tieneFiltro) {
        return {
          ok: false,
          error: "Aplicá un filtro o escribí al menos 3 caracteres en la búsqueda.",
        };
      }

      const filas = await listarListaPreciosFiltradaParaExport(
        provTrim,
        marcaTrim,
        rubroTrim,
        qTrim,
        hab,
        vin,
        opt
      );
      if (filas.length === 0) {
        return { ok: false, error: "Ningún producto coincide con los filtros." };
      }
      ids = filas.map((fila) => fila.id);
    } else {
      ids = parsed.data.ids ?? [];
    }

    const result = await actualizarListaPreciosMasivo(ids, parsed.data.data);
    if (result.error) return { ok: false, error: result.error };
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: { actualizados: result.actualizados } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar la lista de precios.";
    return { ok: false, error: message };
  }
}

/**
 * Elimina un ítem de prod_precios_provee por cod_ext.
 * Solo usuarios con permiso listaPrecios.acciones.edicionMasiva.
 */
export async function eliminarListaPrecioAction(raw: unknown): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para eliminar productos de la lista." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = eliminarListaPrecioSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Código de producto inválido." };
  }

  const result = await eliminarListaPrecioProveedor(parsed.data.codExt);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/proveedores/lista-precios");
  return { ok: true, data: undefined };
}
