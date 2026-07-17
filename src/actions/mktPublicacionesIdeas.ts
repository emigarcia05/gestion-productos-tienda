"use server";

import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktIdeaDetalleItem, MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
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
  listarMktIdeasJerarquia,
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

async function requireMarketingLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    return { ok: false, error: "Sin permisos para marketing." };
  }
  return null;
}

async function requireEditorMarketing(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

export async function listarMktIdeasJerarquiaAction(): Promise<
  ActionResult<MktIdeaSeccionItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktIdeasJerarquia() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar las ideas.",
    };
  }
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
