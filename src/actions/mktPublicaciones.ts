"use server";

import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
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
  listarMktPublicacionesCalendario,
} from "@/services/mktPublicaciones.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateCalendario(): void {
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

export async function listarMktPublicacionesCalendarioAction(): Promise<
  ActionResult<MktPublicacionCalendarioItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktPublicacionesCalendario() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar las publicaciones.",
    };
  }
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
