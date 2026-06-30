"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  type MapeoColumnas,
} from "@/lib/parsearImport";
import {
  importarProductosSchema,
} from "@/lib/validations/importar";

export type { FilaProducto, MapeoColumnas } from "@/lib/parsearImport";

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
