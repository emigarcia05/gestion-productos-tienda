"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { prismaCuidSchema } from "@/lib/validations/common";
import { actualizarControladoComprobante } from "@/services/controlComprobantes.service";

const toggleControladoSchema = z.object({
  id: prismaCuidSchema,
  controlado: z.boolean(),
});

export async function actualizarControladoComprobanteAction(
  raw: unknown
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para acceder a finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = toggleControladoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos para actualizar el comprobante." };
  }

  const result = await actualizarControladoComprobante(
    parsed.data.id,
    parsed.data.controlado
  );
  if (!result.success) return { ok: false, error: result.error };

  revalidatePath("/finanzas");
  revalidatePath("/finanzas/control-comprobantes");

  return { ok: true, data: undefined };
}
