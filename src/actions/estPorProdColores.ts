"use server";

import { revalidatePath } from "next/cache";
import type { EstPorProdColorItem } from "@/lib/estPorProdColores";
import { requireEditorEstadisticas, requireEstadisticasLectura } from "@/lib/actionGates";
import type { ActionResult } from "@/lib/types";
import {
  crearEstPorProdColorSchema,
  editarEstPorProdColorSchema,
  eliminarEstPorProdColorSchema,
} from "@/lib/validations/estPorProdColores";
import {
  crearEstPorProdColor,
  editarEstPorProdColor,
  eliminarEstPorProdColor,
  listarEstPorProdColores,
} from "@/services/estPorProdColores.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}



export async function listarEstPorProdColoresAction(): Promise<
  ActionResult<EstPorProdColorItem[]>
> {
  const gate = await requireEstadisticasLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarEstPorProdColores() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar los colores.",
    };
  }
}

export async function crearEstPorProdColorAction(
  raw: unknown
): Promise<ActionResult<EstPorProdColorItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = crearEstPorProdColorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearEstPorProdColor(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/estadisticas-productos");
    revalidatePath("/estadisticas-productos/ventas-por-producto");
    revalidatePath("/estadisticas-productos/categorizacion");
    return { ok: true, data: res.data };
}

export async function editarEstPorProdColorAction(
  raw: unknown
): Promise<ActionResult<EstPorProdColorItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = editarEstPorProdColorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarEstPorProdColor(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/estadisticas-productos");
    revalidatePath("/estadisticas-productos/ventas-por-producto");
    revalidatePath("/estadisticas-productos/categorizacion");
    return { ok: true, data: res.data };
}

export async function eliminarEstPorProdColorAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = eliminarEstPorProdColorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarEstPorProdColor(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/estadisticas-productos");
    revalidatePath("/estadisticas-productos/ventas-por-producto");
    revalidatePath("/estadisticas-productos/categorizacion");
    return { ok: true, data: res.data };
}
