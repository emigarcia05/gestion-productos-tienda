"use server";

import { revalidatePath } from "next/cache";
import type { EstPorProdLtsConversionItem } from "@/lib/estPorProdLtsConversion";
import { ESTADISTICAS_PRODUCTOS_ROUTES } from "@/lib/estadisticasProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  crearEstPorProdLtsConversionSchema,
  editarEstPorProdLtsConversionSchema,
  eliminarEstPorProdLtsConversionSchema,
} from "@/lib/validations/estPorProdLtsConversion";
import {
  crearEstPorProdLtsConversion,
  editarEstPorProdLtsConversion,
  eliminarEstPorProdLtsConversion,
  listarEstPorProdLtsConversiones,
} from "@/services/estPorProdLtsConversion.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

async function requireEstadisticasLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    return { ok: false, error: "Sin permisos para estadísticas de productos." };
  }
  return null;
}

async function requireEditorEstadisticas(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireEstadisticasLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede gestionar conversiones de litros." };
  }
  return null;
}

function revalidateCategorizacion() {
  revalidatePath("/estadisticas-productos");
  revalidatePath(ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion);
}

export async function listarEstPorProdLtsConversionesAction(): Promise<
  ActionResult<EstPorProdLtsConversionItem[]>
> {
  const gate = await requireEstadisticasLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarEstPorProdLtsConversiones() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar las conversiones.",
    };
  }
}

export async function crearEstPorProdLtsConversionAction(
  raw: unknown
): Promise<ActionResult<EstPorProdLtsConversionItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = crearEstPorProdLtsConversionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearEstPorProdLtsConversion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}

export async function editarEstPorProdLtsConversionAction(
  raw: unknown
): Promise<ActionResult<EstPorProdLtsConversionItem>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = editarEstPorProdLtsConversionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarEstPorProdLtsConversion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}

export async function eliminarEstPorProdLtsConversionAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorEstadisticas();
  if (gate) return gate;
  const parsed = eliminarEstPorProdLtsConversionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarEstPorProdLtsConversion(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCategorizacion();
  return { ok: true, data: res.data };
}
