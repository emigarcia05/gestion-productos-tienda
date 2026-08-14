"use server";

import { firstZodErrorMessage, requireEditorEstadisticas, requireEstadisticasLectura } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import type { EstPorProdTerminacionItem } from "@/lib/estPorProdTerminacion";
import { ESTADISTICAS_PRODUCTOS_ROUTES } from "@/lib/estadisticasProductosRoutes";
import type { ActionResult } from "@/lib/types";
import {
  crearEstPorProdTerminacionSchema,
  editarEstPorProdTerminacionSchema,
  eliminarEstPorProdTerminacionSchema,
} from "@/lib/validations/estPorProdTerminacion";
import {
  crearEstPorProdTerminacion,
  editarEstPorProdTerminacion,
  eliminarEstPorProdTerminacion,
  listarEstPorProdTerminaciones,
} from "@/services/estPorProdTerminacion.service";

function revalidateCategorizacion() {
  revalidatePath("/estadisticas-productos");
  revalidatePath(ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion);
}

export async function listarEstPorProdTerminacionesAction(): Promise<
  ActionResult<EstPorProdTerminacionItem[]>
> {
  const gate = await requireEstadisticasLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarEstPorProdTerminaciones() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar las terminaciones.",
    };
  }
}

export async function crearEstPorProdTerminacionAction(
  raw: unknown
): Promise<ActionResult<EstPorProdTerminacionItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = crearEstPorProdTerminacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearEstPorProdTerminacion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}

export async function editarEstPorProdTerminacionAction(
  raw: unknown
): Promise<ActionResult<EstPorProdTerminacionItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = editarEstPorProdTerminacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarEstPorProdTerminacion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}

export async function eliminarEstPorProdTerminacionAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = eliminarEstPorProdTerminacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarEstPorProdTerminacion(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}
