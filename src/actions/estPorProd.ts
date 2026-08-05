"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  eliminarEstPorProdPorPeriodoSchema,
  eliminarEstPorProdSchema,
  importarEstPorProdSchema,
  verificarEstPorProdPeriodoSchema,
} from "@/lib/validations/estPorProd";
import type { EstPorProdItem } from "@/lib/estPorProdTypes";
import {
  eliminarEstPorProd,
  eliminarEstPorProdPorPeriodo,
  importarEstPorProd,
  verificarEstPorProdPeriodo,
  type EstPorProdPeriodoExistente,
  type ImportarEstPorProdResultado,
} from "@/services/estPorProd.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ?? "Datos inválidos."
  );
}

export async function verificarEstPorProdPeriodoAction(
  raw: unknown
): Promise<ActionResult<EstPorProdPeriodoExistente>> {
  try {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
      return { ok: false, error: "Sin permisos para estadísticas de productos." };
    }

    const parsed = verificarEstPorProdPeriodoSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: firstZodErrorMessage(parsed.error) };
    }

    const res = await verificarEstPorProdPeriodo(
      parsed.data.sucursalId,
      parsed.data.mes,
      parsed.data.anio
    );
    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo verificar el periodo.";
    console.error("[estPorProd] verificarEstPorProdPeriodoAction:", e);
    return { ok: false, error: msg };
  }
}

export async function importarEstPorProdAction(
  raw: unknown
): Promise<ActionResult<ImportarEstPorProdResultado>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    return { ok: false, error: "Sin permisos para estadísticas de productos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede importar estadísticas." };
  }

  const parsed = importarEstPorProdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  try {
    const res = await importarEstPorProd(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/estadisticas-productos");
    revalidatePath("/estadisticas-productos/ventas-por-producto");
    revalidatePath("/estadisticas-productos/categorizacion");
    return { ok: true, data: res.data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo importar la planilla.";
    return { ok: false, error: msg };
  }
}

export async function eliminarEstPorProdAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    return { ok: false, error: "Sin permisos para estadísticas de productos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede eliminar registros." };
  }

  const parsed = eliminarEstPorProdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  try {
    const res = await eliminarEstPorProd(parsed.data.id);
    if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/estadisticas-productos");
    revalidatePath("/estadisticas-productos/ventas-por-producto");
    revalidatePath("/estadisticas-productos/categorizacion");
    return { ok: true, data: res.data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo eliminar el registro.";
    return { ok: false, error: msg };
  }
}

export async function eliminarEstPorProdPorPeriodoAction(
  raw: unknown
): Promise<ActionResult<{ eliminados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    return { ok: false, error: "Sin permisos para estadísticas de productos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede eliminar registros." };
  }

  const parsed = eliminarEstPorProdPorPeriodoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  try {
    const res = await eliminarEstPorProdPorPeriodo(
      parsed.data.sucursalId,
      parsed.data.mes,
      parsed.data.anio
    );
    if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/estadisticas-productos");
    revalidatePath("/estadisticas-productos/ventas-por-producto");
    revalidatePath("/estadisticas-productos/categorizacion");
    return { ok: true, data: res.data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo eliminar el periodo.";
    return { ok: false, error: msg };
  }
}

export type { EstPorProdItem };
