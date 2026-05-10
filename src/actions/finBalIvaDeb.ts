"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { upsertFinBalIvaDebSchema } from "@/lib/validations/finBalIvaDeb";
import {
  upsertFinBalIvaDeb,
  type FinBalIvaDebItem,
} from "@/services/finBalIvaDeb.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ?? "Datos inválidos."
  );
}

export async function upsertFinBalIvaDebAction(raw: unknown): Promise<ActionResult<FinBalIvaDebItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede cargar totales de ventas con IVA." };
  }
  const parsed = upsertFinBalIvaDebSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const res = await upsertFinBalIvaDeb(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidatePath("/finanzas/balance/posicion-iva");
  return { ok: true, data: res.data };
}
