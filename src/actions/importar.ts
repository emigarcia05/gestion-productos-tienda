"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import {
  type MapeoColumnas,
  type MapeoColumnasListaPrecios,
  aplicarMapeoListaPrecios,
} from "@/lib/parsearImport";
import { getProveedores } from "@/actions/proveedores";
import * as listaPreciosService from "@/services/listaPrecios.service";

export type { FilaProducto, MapeoColumnas } from "@/lib/parsearImport";
export type { MapeoColumnasListaPrecios } from "@/lib/parsearImport";

export interface ImportResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

// ─── Importar productos (mock) ──────────────────────────────────────────────

export async function importarProductos(
  proveedorId: string,
  filasCrudas: string[][],
  mapeo: MapeoColumnas
): Promise<ImportResult> {
  if (!(await esEditor())) throw new Error("Sin permisos de editor.");
  if (!proveedorId) throw new Error("Debe seleccionar un proveedor.");
  if (!filasCrudas.length) throw new Error("No hay filas para importar.");
  revalidatePath("/proveedores");
  revalidatePath("/proveedores/lista");
  revalidatePath("/proveedores/gestion");
  return { creados: 0, actualizados: 0, eliminados: 0, errores: [] };
}

// ─── Importar lista de precios proveedor (upsert lista_precios_proveedores) ───

export async function importarListaPreciosProveedor(
  proveedorId: string,
  filasCrudas: string[][],
  mapeo: MapeoColumnasListaPrecios,
  precioEnDolares: boolean = false,
  habilitado: boolean = true
): Promise<ImportResult> {
  if (!(await esEditor())) throw new Error("Sin permisos de editor.");
  if (!proveedorId) throw new Error("Debe seleccionar un proveedor.");
  if (!filasCrudas.length) throw new Error("No hay filas para importar.");

  const proveedores = await getProveedores();
  const proveedor = proveedores.find((p) => p.id === proveedorId);
  if (!proveedor) throw new Error("Proveedor no encontrado.");
  const prefijo = proveedor.prefijo;

  const filas = aplicarMapeoListaPrecios(filasCrudas, mapeo);
  if (filas.length === 0) throw new Error("No hay filas válidas para importar.");

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

  return { creados, actualizados, eliminados: 0, errores };
}
