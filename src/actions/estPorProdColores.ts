"use server";

import { revalidatePath } from "next/cache";
import type { EstPorProdColorItem } from "@/lib/estPorProdColores";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
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
    return { ok: false, error: "Solo el modo editor puede gestionar colores." };
  }
  return null;
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
  return { ok: true, data: res.data };
}
