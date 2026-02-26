"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { MapeoColumnas } from "@/lib/parsearImport";

export type { FilaProducto, MapeoColumnas } from "@/lib/parsearImport";

export interface ImportResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

// ─── MOCK: sin Prisma; simula importación exitosa vacía ──────────────────────

export async function importarProductos(
  proveedorId: string,
  filasCrudas: string[][],
  mapeo: MapeoColumnas
): Promise<ImportResult> {
  if (!(await esEditor())) throw new Error("Sin permisos de editor.");
  if (!proveedorId) throw new Error("Debe seleccionar un proveedor.");
  if (!filasCrudas.length) throw new Error("No hay filas para importar.");
  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${proveedorId}`);
  return { creados: 0, actualizados: 0, eliminados: 0, errores: [] };
}
