"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  cargarImputacionesMesParamsSchema,
  editarMontoFinBalGastoMensualSchema,
  eliminarFinBalGastoMensualSchema,
  obtenerMontoMesAnteriorSchema,
} from "@/lib/validations/finBalGastoMensualBalance";
import {
  actualizarMontoFinBalGastoMensual,
  cargarImputacionesMensualesDesdeCatalogo,
  eliminarFinBalGastoMensual,
  mesAnioCalendarioArgentina,
  obtenerMontoImputacionMesAnterior,
} from "@/services/finBalGastoMensualBalance.service";

function revalidateGastosPaths(): void {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/balance/gastos");
}

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

async function requireEditorFinanzas(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

/** Carga imputaciones del mes `(mes, anio)` desde el catálogo (`gasto_mensual = true`). */
export async function cargarFinBalGastoMensualMesAction(
  raw?: unknown
): Promise<ActionResult<{ creados: number; yaExistentes: number }>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const def = mesAnioCalendarioArgentina();
  const parsed = cargarImputacionesMesParamsSchema.safeParse(
    raw && typeof raw === "object" && raw !== null ? raw : { mes: def.mes, anio: def.anio }
  );
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const res = await cargarImputacionesMensualesDesdeCatalogo(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidateGastosPaths();
  return { ok: true, data: res.data };
}

export async function editarMontoFinBalGastoMensualAction(
  raw: unknown
): Promise<ActionResult<{ id: string; monto: number }>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = editarMontoFinBalGastoMensualSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const res = await actualizarMontoFinBalGastoMensual(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidateGastosPaths();
  return { ok: true, data: res.data };
}

export async function eliminarFinBalGastoMensualAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = eliminarFinBalGastoMensualSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const res = await eliminarFinBalGastoMensual(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };

  revalidateGastosPaths();
  return { ok: true, data: res.data };
}

/** Monto de la imputación del mes calendario **anterior** al dado, mismo `gasto_final_id`. */
export async function obtenerMontoMesAnteriorFinBalGastoMensualAction(
  raw: unknown
): Promise<ActionResult<{ monto: number | null }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }

  const parsed = obtenerMontoMesAnteriorSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const monto = await obtenerMontoImputacionMesAnterior(parsed.data);
  return { ok: true, data: { monto } };
}
