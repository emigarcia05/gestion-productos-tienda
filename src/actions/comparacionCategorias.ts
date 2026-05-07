"use server";

import { revalidatePath } from "next/cache";
import {
  getArbolCategorias,
  getProductosPorPresentacion,
  getPresentacionesConLabel,
  getPresentacionesParaGestion,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  createSubcategoria,
  updateSubcategoria,
  deleteSubcategoria,
  createPresentacion,
  updatePresentacion,
  deletePresentacion,
  asignarProductosAPresentacion,
  quitarAsignacionPresentacion,
  actualizarDtoExtraComparacionItem,
} from "@/services/categoriasComparacion.service";
import { listarProductosProveedoresParaVincular } from "@/services/listaPrecios.service";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  presentacionIdSchema,
  createCategoriaSchema,
  updateCategoriaSchema,
  createSubcategoriaSchema,
  updateSubcategoriaSchema,
  createPresentacionSchema,
  updatePresentacionSchema,
  asignarProductosSchema,
  idsProductosSchema,
  comparacionIdSchema,
  actualizarDtoExtraComparacionSchema,
} from "@/lib/validations/comparacionCategorias";
import { z } from "zod";

const buscarProductosAsignarSchema = z.object({
  proveedorId: z.string().max(128).optional(),
  q: z.string().max(500).optional(),
});

const PATH = "/proveedores/comparacion-categorias";

/** Resuelve si el rol vigente tiene permiso de edición de comparación-categorías. */
async function tienePermisoEditar(): Promise<boolean> {
  const rol = await getRol();
  return puede(rol, PERMISOS.comparacionCategorias.editar);
}

/** Árbol de categorías (lectura para todos con acceso). */
export async function getArbolCategoriasAction(): Promise<ActionResult<Awaited<ReturnType<typeof getArbolCategorias>>>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const data = await getArbolCategorias();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cargar el árbol de categorías." };
  }
}

/** Productos de una presentación con comparación vs objetivo. */
export async function getProductosPorPresentacionAction(
  presentacionId: string
): Promise<ActionResult<{ productos: Awaited<ReturnType<typeof getProductosPorPresentacion>>["productos"]; costoCompraObjetivo: number | null; labelCompleto: string }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = presentacionIdSchema.safeParse(presentacionId);
  if (!parsed.success) return { ok: false, error: "ID de presentación inválido." };
  try {
    const result = await getProductosPorPresentacion(parsed.data);
    return {
      ok: true,
      data: {
        productos: result.productos,
        costoCompraObjetivo: result.costoCompraObjetivo,
        labelCompleto: result.labelCompleto,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cargar productos." };
  }
}

/** Lista de presentaciones con label (para selects). */
export async function getPresentacionesConLabelAction(): Promise<ActionResult<Awaited<ReturnType<typeof getPresentacionesConLabel>>>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const data = await getPresentacionesConLabel();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cargar presentaciones." };
  }
}

/** Lista plana de presentaciones para modal Gestionar categorías (combinación + producto ref + costo objetivo). */
export async function getPresentacionesParaGestionAction(): Promise<ActionResult<Awaited<ReturnType<typeof getPresentacionesParaGestion>>>> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  try {
    const data = await getPresentacionesParaGestion();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cargar presentaciones." };
  }
}

/** Buscar productos de lista precios para asignar a una categoría (modal). Misma forma que Vincular nuevo producto. */
export async function buscarProductosParaAsignarAction(
  proveedorId?: string,
  q?: string
): Promise<ActionResult<Awaited<ReturnType<typeof listarProductosProveedoresParaVincular>>>> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = buscarProductosAsignarSchema.safeParse({ proveedorId, q });
  if (!parsed.success) return { ok: false, error: "Parámetros de búsqueda inválidos." };
  try {
    const data = await listarProductosProveedoresParaVincular(
      parsed.data.proveedorId,
      parsed.data.q ?? ""
    );
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al buscar productos." };
  }
}

// ─── CRUD Categorias ────────────────────────────────────────────────────────
export async function createCategoriaAction(nombre: string): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = createCategoriaSchema.safeParse({ nombre });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.nombre?.[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Nombre inválido." };
  }
  try {
    await createCategoria(parsed.data.nombre);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear categoría." };
  }
}

export async function updateCategoriaAction(id: string, data: { nombre?: string }): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = updateCategoriaSchema.safeParse({ id, data });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  try {
    await updateCategoria(parsed.data.id, parsed.data.data);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar." };
  }
}

export async function deleteCategoriaAction(id: string): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = comparacionIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "ID inválido." };
  try {
    await deleteCategoria(parsed.data);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar." };
  }
}

// ─── CRUD Subcategorias ─────────────────────────────────────────────────────
export async function createSubcategoriaAction(categoriaId: string, nombre: string): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = createSubcategoriaSchema.safeParse({ categoriaId, nombre });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.nombre?.[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  try {
    await createSubcategoria(parsed.data.categoriaId, parsed.data.nombre);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear subcategoría." };
  }
}

export async function updateSubcategoriaAction(
  id: string,
  data: { nombre?: string; categoriaId?: string }
): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = updateSubcategoriaSchema.safeParse({ id, data });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  try {
    await updateSubcategoria(parsed.data.id, parsed.data.data);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar." };
  }
}

export async function deleteSubcategoriaAction(id: string): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = comparacionIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "ID inválido." };
  try {
    await deleteSubcategoria(parsed.data);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar." };
  }
}

// ─── CRUD Presentaciones ────────────────────────────────────────────────────
export async function createPresentacionAction(
  subcategoriaId: string,
  nombre: string,
  costoCompraObjetivo?: number | null
): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = createPresentacionSchema.safeParse({ subcategoriaId, nombre, costoCompraObjetivo });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.nombre?.[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  try {
    await createPresentacion(parsed.data.subcategoriaId, parsed.data.nombre, parsed.data.costoCompraObjetivo);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear presentación." };
  }
}

export async function updatePresentacionAction(
  id: string,
  data: { nombre?: string; subcategoriaId?: string; costoCompraObjetivo?: number | null; idProductoReferencia?: string | null }
): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = updatePresentacionSchema.safeParse({ id, data });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  try {
    await updatePresentacion(parsed.data.id, parsed.data.data);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar." };
  }
}

export async function deletePresentacionAction(id: string): Promise<ActionResult> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = comparacionIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "ID inválido." };
  try {
    await deletePresentacion(parsed.data);
    revalidatePath(PATH);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar." };
  }
}

/** Asignar productos a una presentación. */
export async function asignarProductosAPresentacionAction(
  presentacionId: string,
  idsProductos: string[]
): Promise<ActionResult<{ count: number }>> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = asignarProductosSchema.safeParse({ presentacionId, idsProductos });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  try {
    const { count } = await asignarProductosAPresentacion(parsed.data.presentacionId, parsed.data.idsProductos);
    revalidatePath(PATH);
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: { count } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al asignar." };
  }
}

/** Quitar asignación de presentación de productos. */
export async function quitarAsignacionPresentacionAction(
  idsProductos: string[]
): Promise<ActionResult<{ count: number }>> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };
  const parsed = idsProductosSchema.safeParse(idsProductos);
  if (!parsed.success) return { ok: false, error: "IDs inválidos." };
  try {
    const { count } = await quitarAsignacionPresentacion(parsed.data);
    revalidatePath(PATH);
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: { count } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al quitar asignación." };
  }
}

/** Persistir DTO. EXTRA (0-99 o null) para "Comp. Por Cat." por ítem (ListaPrecioProveedor). */
export async function actualizarDtoExtraComparacionAction(
  listaPrecioProveedorId: string,
  dtoExtra: number | null
): Promise<ActionResult<{ dtoExtra: number | null }>> {
  if (!(await tienePermisoEditar())) return { ok: false, error: "Sin permisos." };

  const parsed = actualizarDtoExtraComparacionSchema.safeParse({ listaPrecioProveedorId, dtoExtra });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  try {
    await actualizarDtoExtraComparacionItem(parsed.data.listaPrecioProveedorId, parsed.data.dtoExtra);
    revalidatePath(PATH);
    return { ok: true, data: { dtoExtra: parsed.data.dtoExtra } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar DTO extra." };
  }
}
