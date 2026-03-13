"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import {
  type MapeoColumnas,
  type MapeoColumnasListaPrecios,
  aplicarMapeoListaPrecios,
} from "@/lib/parsearImport";
import * as listaPreciosService from "@/services/listaPrecios.service";
import { getProveedorById } from "@/services/proveedor.service";

export type { FilaProducto, MapeoColumnas, MapeoColumnasListaPrecios } from "@/lib/parsearImport";

export interface ImportResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

/** Resultado tipado para el frontend: éxito con datos o error. */
export type ImportActionResult =
  | { ok: true; data: ImportResult }
  | { ok: false; error: string };

// ─── Importar productos (mock) ──────────────────────────────────────────────

export async function importarProductos(
  proveedorId: string,
  filasCrudas: string[][],
  mapeo: MapeoColumnas
): Promise<ImportActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  if (!proveedorId?.trim()) return { ok: false, error: "Debe seleccionar un proveedor." };
  if (!Array.isArray(filasCrudas) || filasCrudas.length === 0) return { ok: false, error: "No hay filas para importar." };

  revalidatePath("/proveedores");
  revalidatePath("/proveedores/lista");
  revalidatePath("/proveedores/gestion");
  return { ok: true, data: { creados: 0, actualizados: 0, eliminados: 0, errores: [] } };
}

// ─── Importar lista de precios proveedor (upsert lista_precios_proveedores) ───

export async function importarListaPreciosProveedor(
  proveedorId: string,
  filasCrudas: string[][],
  mapeo: MapeoColumnasListaPrecios,
  precioEnDolares: boolean = false,
  habilitado: boolean = true
): Promise<ImportActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  if (!proveedorId?.trim()) return { ok: false, error: "Debe seleccionar un proveedor." };
  if (!Array.isArray(filasCrudas) || filasCrudas.length === 0) return { ok: false, error: "No hay filas para importar." };

  const proveedor = await getProveedorById(proveedorId);
  if (!proveedor) return { ok: false, error: "Proveedor no encontrado." };
  const prefijo = proveedor.prefijo;

  const filas = aplicarMapeoListaPrecios(filasCrudas, mapeo);
  if (filas.length === 0) return { ok: false, error: "No hay filas válidas para importar." };

  try {
    const { creados, actualizados, errores } = await listaPreciosService.upsertListaPrecios(
      proveedorId,
      prefijo,
      filas,
      precioEnDolares,
      habilitado
    );

    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista-precios");
    revalidatePath("/proveedores/lista");
    revalidatePath("/proveedores/gestion");

    return { ok: true, data: { creados, actualizados, eliminados: 0, errores } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al importar lista de precios.";
    return { ok: false, error: message };
  }
}
