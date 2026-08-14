"use server";

import { firstZodErrorMessage, requireEditorMarketing } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import type { ActionResult } from "@/lib/types";
import {
  crearMktPublicacionSchema,
  editarMktPublicacionSchema,
  eliminarMktPublicacionSchema,
} from "@/lib/validations/mktPublicaciones";
import {
  crearMktPublicacion,
  editarMktPublicacion,
  eliminarMktPublicacion,
} from "@/services/mktPublicaciones.service";

function revalidateCalendario(): void {
  revalidatePath(MARKETING_ROUTES.publicaciones.calendario);
  /** `usada` de ideas cambia al programar / liberar. */
  revalidatePath(MARKETING_ROUTES.publicaciones.ideas);
}

export async function crearMktPublicacionAction(
  raw: unknown
): Promise<ActionResult<MktPublicacionCalendarioItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktPublicacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktPublicacion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCalendario();
  return { ok: true, data: res.data };
}

export async function editarMktPublicacionAction(
  raw: unknown
): Promise<ActionResult<MktPublicacionCalendarioItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktPublicacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktPublicacion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCalendario();
  return { ok: true, data: res.data };
}

export async function eliminarMktPublicacionAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktPublicacionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktPublicacion(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateCalendario();
  return { ok: true, data: res.data };
}
