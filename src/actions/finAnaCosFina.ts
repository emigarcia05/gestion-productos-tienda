"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { actualizarFinAnaCosFinaSchema } from "@/lib/validations/finAnaCosFina";
import {
  actualizarFinAnaCosFina,
  type FinAnaCosFinaItem,
} from "@/services/finAnaCosFina.service";

const RUTA_COSTOS_FINANCIEROS = "/finanzas/analisis-mc/costos-financieros";

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

export async function actualizarFinAnaCosFinaAction(
  raw: unknown
): Promise<ActionResult<FinAnaCosFinaItem>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = actualizarFinAnaCosFinaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  try {
    const data = await actualizarFinAnaCosFina(parsed.data);
    revalidatePath(RUTA_COSTOS_FINANCIEROS);
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No se pudo actualizar el costo financiero." };
  }
}
