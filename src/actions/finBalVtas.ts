"use server";

import { firstZodErrorMessage } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  eliminarFinBalVtasSchema,
  guardarFinBalVtasCargaPeriodoSchema,
  listarFinBalVtasPorMesAnioSchema,
} from "@/lib/validations/finBalVtas";
import {
  eliminarFinBalVtas,
  guardarFinBalVtasCargaPeriodo,
  listarFinBalVtasPorMesAnio,
  type FinBalVtasItem,
} from "@/services/finBalVtas.service";

export async function listarFinBalVtasPorMesAnioAction(
  raw: unknown
): Promise<ActionResult<FinBalVtasItem[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  const parsed = listarFinBalVtasPorMesAnioSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const data = await listarFinBalVtasPorMesAnio(parsed.data.mes, parsed.data.anio);
  return { ok: true, data };
}

export async function guardarFinBalVtasCargaPeriodoAction(
  raw: unknown
): Promise<ActionResult<{ guardados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede cargar ventas de balance." };
  }
  const parsed = guardarFinBalVtasCargaPeriodoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await guardarFinBalVtasCargaPeriodo(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidatePath("/finanzas/balance/vtas");
  revalidatePath("/finanzas/balance/mensual");
  return { ok: true, data: res.data };
}

export async function eliminarFinBalVtasAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede eliminar registros." };
  }
  const parsed = eliminarFinBalVtasSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarFinBalVtas(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidatePath("/finanzas/balance/vtas");
  revalidatePath("/finanzas/balance/mensual");
  return { ok: true, data: res.data };
}
