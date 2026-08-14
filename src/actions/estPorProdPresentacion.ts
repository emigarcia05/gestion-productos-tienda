"use server";

import { firstZodErrorMessage, requireEditorEstadisticas, requireEstadisticasLectura } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import type { EstPorProdPresentacionItem } from "@/lib/estPorProdPresentacion";
import { ESTADISTICAS_PRODUCTOS_ROUTES } from "@/lib/estadisticasProductosRoutes";
import type { ActionResult } from "@/lib/types";
import {
  crearEstPorProdPresentacionSchema,
  editarEstPorProdPresentacionSchema,
  eliminarEstPorProdPresentacionSchema,
} from "@/lib/validations/estPorProdPresentacion";
import {
  crearEstPorProdPresentacion,
  editarEstPorProdPresentacion,
  eliminarEstPorProdPresentacion,
  listarEstPorProdPresentaciones,
} from "@/services/estPorProdPresentacion.service";

function revalidateCategorizacion() {
  revalidatePath("/estadisticas-productos");
  revalidatePath(ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion);
}

export async function listarEstPorProdPresentacionesAction(): Promise<
  ActionResult<EstPorProdPresentacionItem[]>
> {
  const gate = await requireEstadisticasLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarEstPorProdPresentaciones() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar las presentaciones.",
    };
  }
}

export async function crearEstPorProdPresentacionAction(
  raw: unknown
): Promise<ActionResult<EstPorProdPresentacionItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = crearEstPorProdPresentacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearEstPorProdPresentacion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}

export async function editarEstPorProdPresentacionAction(
  raw: unknown
): Promise<ActionResult<EstPorProdPresentacionItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = editarEstPorProdPresentacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarEstPorProdPresentacion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}

export async function eliminarEstPorProdPresentacionAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = eliminarEstPorProdPresentacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarEstPorProdPresentacion(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}
