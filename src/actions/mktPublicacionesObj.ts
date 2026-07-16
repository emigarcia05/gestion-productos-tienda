"use server";

import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktPublicacionObjItem } from "@/lib/mktPublicacionesObj";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  crearMktPublicacionObjSchema,
  editarMktPublicacionObjSchema,
  eliminarMktPublicacionObjSchema,
} from "@/lib/validations/mktPublicacionesObj";
import {
  crearMktPublicacionObj,
  editarMktPublicacionObj,
  eliminarMktPublicacionObj,
  listarMktPublicacionObjs,
} from "@/services/mktPublicacionesObj.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
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

export async function listarMktPublicacionObjsAction(): Promise<
  ActionResult<MktPublicacionObjItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktPublicacionObjs() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar los objetivos.",
    };
  }
}

export async function crearMktPublicacionObjAction(
  raw: unknown
): Promise<ActionResult<MktPublicacionObjItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktPublicacionObjSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktPublicacionObj(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidatePath(MARKETING_ROUTES.publicaciones.calendario);
  revalidatePath(MARKETING_ROUTES.publicaciones.objetivos);
  return { ok: true, data: res.data };
}

export async function editarMktPublicacionObjAction(
  raw: unknown
): Promise<ActionResult<MktPublicacionObjItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktPublicacionObjSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktPublicacionObj(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidatePath(MARKETING_ROUTES.publicaciones.calendario);
  revalidatePath(MARKETING_ROUTES.publicaciones.objetivos);
  return { ok: true, data: res.data };
}

export async function eliminarMktPublicacionObjAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktPublicacionObjSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktPublicacionObj(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidatePath(MARKETING_ROUTES.publicaciones.calendario);
  revalidatePath(MARKETING_ROUTES.publicaciones.objetivos);
  return { ok: true, data: res.data };
}
