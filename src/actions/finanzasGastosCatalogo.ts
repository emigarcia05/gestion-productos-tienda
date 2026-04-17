"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { crearGastoCatalogoSchema } from "@/lib/validations/finanzasGastosCatalogo";
import {
  crearGastoCatalogo,
  type FinanzasGastoCatalogoItem,
} from "@/services/finanzasGastosCatalogo.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateGastosCatalogoPaths(): void {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/balance/gastos");
}

export async function crearGastoCatalogoAction(
  raw: unknown
): Promise<ActionResult<FinanzasGastoCatalogoItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = crearGastoCatalogoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res =
    parsed.data.modoRubro === "EXISTENTE"
      ? await crearGastoCatalogo({
          tipoCosto: parsed.data.tipoCosto,
          nombre: parsed.data.nombre,
          rubroId: parsed.data.rubroId,
        })
      : await crearGastoCatalogo({
          tipoCosto: parsed.data.tipoCosto,
          nombre: parsed.data.nombre,
          rubroNombreNuevo: parsed.data.rubroNombreNuevo,
        });

  if (!res.success) return { ok: false, error: res.error };

  revalidateGastosCatalogoPaths();
  return { ok: true, data: res.data };
}
