"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { crearMovimientoFinanzasSchema } from "@/lib/validations/movimientosFinanzas";
import {
  crearMovimientoFinanzas,
  type MovimientoFinanzasItem,
} from "@/services/movimientosFinanzas.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateGastosPaths(): void {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/balance/gastos");
}

export async function crearMovimientoFinanzasAction(
  raw: unknown
): Promise<ActionResult<MovimientoFinanzasItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = crearMovimientoFinanzasSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await crearMovimientoFinanzas(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidateGastosPaths();
  return { ok: true, data: res.data };
}
