"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  type MapeoColumnas,
  type MapeoColumnasListaPrecios,
  aplicarMapeoListaPrecios,
} from "@/lib/parsearImport";
import * as listaPreciosService from "@/services/listaPrecios.service";
import { getProveedorById } from "@/services/proveedor.service";
import {
  importarListaPreciosProveedorSchema,
  importarProductosSchema,
} from "@/lib/validations/importar";

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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.importar.acceso)) {
    return { ok: false, error: "Sin permisos para importar." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = importarProductosSchema.safeParse({
    proveedorId,
    filasCrudas,
    mapeo: mapeo as Record<string, MapeoColumnas[keyof MapeoColumnas]>,
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos de importación inválidos.";
    return { ok: false, error: msg };
  }

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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.importar.acceso)) {
    return { ok: false, error: "Sin permisos para importar." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = importarListaPreciosProveedorSchema.safeParse({
    proveedorId,
    filasCrudas,
    mapeo: mapeo as Record<string, MapeoColumnasListaPrecios[keyof MapeoColumnasListaPrecios]>,
    precioEnDolares,
    habilitado,
  });
  if (!parsed.success) {
    const msg =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos de importación inválidos.";
    return { ok: false, error: msg };
  }

  const { proveedorId: pid, filasCrudas: filas, mapeo: mapLp, precioEnDolares: enUsd, habilitado: hab } =
    parsed.data;

  const proveedor = await getProveedorById(pid);
  if (!proveedor) return { ok: false, error: "Proveedor no encontrado." };
  const prefijo = proveedor.prefijo;

  const filasMapeadas = aplicarMapeoListaPrecios(filas, mapLp);
  if (filasMapeadas.length === 0) return { ok: false, error: "No hay filas válidas para importar." };

  try {
    const { creados, actualizados, errores } = await listaPreciosService.upsertListaPrecios(
      pid,
      prefijo,
      filasMapeadas,
      enUsd,
      hab
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
