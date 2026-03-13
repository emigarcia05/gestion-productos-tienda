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
  uuidSchema,
} from "@/lib/validations/comparacionCategorias";

const PATH = "/proveedores/comparacion-categorias";

function canEdit() {
  return async () => {
    const rol = await getRol();
    return puede(rol, PERMISOS.comparacionCategorias.editar);
  };
}

/** Árbol de categorías (lectura para todos con acceso). */
export async function getArbolCategoriasAction(): Promise<ActionResult<Awaited<ReturnType<typeof getArbolCategorias>>>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const data = await getArbolCategorias();
  return { ok: true, data };
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
  const result = await getProductosPorPresentacion(parsed.data);
  return {
    ok: true,
    data: {
      productos: result.productos,
      costoCompraObjetivo: result.costoCompraObjetivo,
      labelCompleto: result.labelCompleto,
    },
  };
}

/** Lista de presentaciones con label (para selects). */
export async function getPresentacionesConLabelAction(): Promise<ActionResult<Awaited<ReturnType<typeof getPresentacionesConLabel>>>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const data = await getPresentacionesConLabel();
  return { ok: true, data };
}

/** Lista plana de presentaciones para modal Gestionar categorías (combinación + producto ref + costo objetivo). */
export async function getPresentacionesParaGestionAction(): Promise<ActionResult<Awaited<ReturnType<typeof getPresentacionesParaGestion>>>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.editar)) {
    return { ok: false, error: "Sin permisos." };
  }
  const data = await getPresentacionesParaGestion();
  return { ok: true, data };
}

/** Buscar productos de lista precios para asignar a una categoría (modal). Misma forma que Vincular nuevo producto. */
export async function buscarProductosParaAsignarAction(
  proveedorId?: string,
  q?: string
): Promise<ActionResult<Awaited<ReturnType<typeof listarProductosProveedoresParaVincular>>>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.editar)) {
    return { ok: false, error: "Sin permisos." };
  }
  const data = await listarProductosProveedoresParaVincular(proveedorId, q ?? "");
  return { ok: true, data };
}

// ─── CRUD Categorias ────────────────────────────────────────────────────────
export async function createCategoriaAction(nombre: string): Promise<ActionResult> {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  const parsed = uuidSchema.safeParse(id);
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  const parsed = uuidSchema.safeParse(id);
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  const parsed = uuidSchema.safeParse(id);
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
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
