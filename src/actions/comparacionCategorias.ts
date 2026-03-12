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

const PATH = "/proveedores/comparacion-categorias";

function canEdit() {
  return async () => {
    const rol = await getRol();
    return puede(rol, PERMISOS.comparacionCategorias.editar);
  };
}

/** Árbol de categorías (lectura para todos con acceso). */
export async function getArbolCategoriasAction() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso.", data: null };
  }
  const data = await getArbolCategorias();
  return { ok: true, data };
}

/** Productos de una presentación con comparación vs objetivo. */
export async function getProductosPorPresentacionAction(presentacionId: string) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, error: "Sin acceso.", productos: [], costoCompraObjetivo: null, labelCompleto: "" };
  }
  const result = await getProductosPorPresentacion(presentacionId);
  return {
    ok: true,
    productos: result.productos,
    costoCompraObjetivo: result.costoCompraObjetivo,
    labelCompleto: result.labelCompleto,
  };
}

/** Lista de presentaciones con label (para selects). */
export async function getPresentacionesConLabelAction() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    return { ok: false, data: [] };
  }
  const data = await getPresentacionesConLabel();
  return { ok: true, data };
}

/** Lista plana de presentaciones para modal Gestionar categorías (combinación + producto ref + costo objetivo). */
export async function getPresentacionesParaGestionAction() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.editar)) {
    return { ok: false, error: "Sin permisos.", data: [] };
  }
  const data = await getPresentacionesParaGestion();
  return { ok: true, data };
}

/** Buscar productos de lista precios para asignar a una categoría (modal). Misma forma que Vincular nuevo producto. */
export async function buscarProductosParaAsignarAction(proveedorId?: string, q?: string) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.editar)) {
    return { ok: false, data: [] };
  }
  const data = await listarProductosProveedoresParaVincular(proveedorId, q ?? "");
  return { ok: true, data };
}

// ─── CRUD Categorias ────────────────────────────────────────────────────────
export async function createCategoriaAction(nombre: string, orden?: number) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await createCategoria(nombre, orden);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear categoría." };
  }
}

export async function updateCategoriaAction(id: string, data: { nombre?: string; orden?: number }) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await updateCategoria(id, data);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar." };
  }
}

export async function deleteCategoriaAction(id: string) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await deleteCategoria(id);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar." };
  }
}

// ─── CRUD Subcategorias ─────────────────────────────────────────────────────
export async function createSubcategoriaAction(categoriaId: string, nombre: string, orden?: number) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await createSubcategoria(categoriaId, nombre, orden);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear subcategoría." };
  }
}

export async function updateSubcategoriaAction(
  id: string,
  data: { nombre?: string; orden?: number; categoriaId?: string }
) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await updateSubcategoria(id, data);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar." };
  }
}

export async function deleteSubcategoriaAction(id: string) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await deleteSubcategoria(id);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar." };
  }
}

// ─── CRUD Presentaciones ────────────────────────────────────────────────────
export async function createPresentacionAction(
  subcategoriaId: string,
  nombre: string,
  orden?: number,
  costoCompraObjetivo?: number | null
) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await createPresentacion(subcategoriaId, nombre, orden, costoCompraObjetivo);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear presentación." };
  }
}

export async function updatePresentacionAction(
  id: string,
  data: { nombre?: string; orden?: number; subcategoriaId?: string; costoCompraObjetivo?: number | null }
) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await updatePresentacion(id, data);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar." };
  }
}

export async function deletePresentacionAction(id: string) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos." };
  try {
    await deletePresentacion(id);
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar." };
  }
}

/** Asignar productos a una presentación. */
export async function asignarProductosAPresentacionAction(presentacionId: string, idsProductos: string[]) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos.", count: 0 };
  try {
    const { count } = await asignarProductosAPresentacion(presentacionId, idsProductos);
    revalidatePath(PATH);
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al asignar.", count: 0 };
  }
}

/** Quitar asignación de presentación de productos. */
export async function quitarAsignacionPresentacionAction(idsProductos: string[]) {
  if (!(await canEdit()())) return { ok: false, error: "Sin permisos.", count: 0 };
  try {
    const { count } = await quitarAsignacionPresentacion(idsProductos);
    revalidatePath(PATH);
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al quitar asignación.", count: 0 };
  }
}
