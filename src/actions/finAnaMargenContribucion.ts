"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  actualizarDescuentoFpMargenContribucion,
  listarDescuentosFpMargenContribucion,
} from "@/services/finAnaMcDescuentoFp.service";
import { actualizarDescuentoFpMargenContribucionSchema } from "@/lib/validations/finAnaMcDescuentoFp";
import type { DescuentoFpMargenContribucionMap } from "@/services/finAnaMcDescuentoFp.service";

const RUTA_MARGEN_CONTRIBUCION = "/finanzas/analisis-mc/margen-contribucion";

async function requireFinanzasLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  return null;
}

async function requireEditorFinanzas(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

export async function listarDescuentosFpMargenContribucionAction(): Promise<
  ActionResult<DescuentoFpMargenContribucionMap>
> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;

  const map = await listarDescuentosFpMargenContribucion();
  return { ok: true, data: map };
}

export async function actualizarDescuentoFpMargenContribucionAction(
  params: unknown
): Promise<ActionResult<DescuentoFpMargenContribucionMap>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = actualizarDescuentoFpMargenContribucionSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await actualizarDescuentoFpMargenContribucion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}
