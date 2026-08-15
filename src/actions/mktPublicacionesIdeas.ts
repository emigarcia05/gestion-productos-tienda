"use server";

import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktIdeaDetalleItem, MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";
import { requireEditorMarketing } from "@/lib/actionGates";
import type { ActionResult } from "@/lib/types";
import {
  crearMktIdeaDetalleSchema,
  crearMktIdeaSeccionSchema,
  editarMktIdeaDetalleSchema,
  editarMktIdeaSeccionSchema,
  eliminarMktIdeaDetalleSchema,
  eliminarMktIdeaSeccionSchema,
} from "@/lib/validations/mktPublicacionesIdeas";
import {
  crearMktIdeaDetalle,
  crearMktIdeaSeccion,
  editarMktIdeaDetalle,
  editarMktIdeaSeccion,
  eliminarMktIdeaDetalle,
  eliminarMktIdeaSeccion,
} from "@/services/mktPublicacionesIdeas.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateIdeas(): void {
  revalidatePath(MARKETING_ROUTES.publicaciones.ideas);
  revalidatePath(MARKETING_ROUTES.publicaciones.calendario);
}



export async function crearMktIdeaSeccionAction(
  raw: unknown
): Promise<ActionResult<MktIdeaSeccionItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktIdeaSeccionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktIdeaSeccion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateIdeas();
  return { ok: true, data: res.data };
}

export async function editarMktIdeaSeccionAction(
  raw: unknown
): Promise<ActionResult<MktIdeaSeccionItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktIdeaSeccionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktIdeaSeccion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateIdeas();
  return { ok: true, data: res.data };
}

export async function eliminarMktIdeaSeccionAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktIdeaSeccionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktIdeaSeccion(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateIdeas();
  return { ok: true, data: res.data };
}

export async function crearMktIdeaDetalleAction(
  raw: unknown
): Promise<ActionResult<MktIdeaDetalleItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktIdeaDetalleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktIdeaDetalle(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateIdeas();
  return { ok: true, data: res.data };
}

export async function editarMktIdeaDetalleAction(
  raw: unknown
): Promise<ActionResult<MktIdeaDetalleItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktIdeaDetalleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktIdeaDetalle(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateIdeas();
  return { ok: true, data: res.data };
}

export async function eliminarMktIdeaDetalleAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktIdeaDetalleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktIdeaDetalle(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateIdeas();
  return { ok: true, data: res.data };
}
