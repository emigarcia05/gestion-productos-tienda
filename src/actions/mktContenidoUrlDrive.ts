"use server";

import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktContenidoUrlDriveItem } from "@/lib/mktContenidoUrlDrive";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  crearMktContenidoUrlDriveSchema,
  editarMktContenidoUrlDriveSchema,
  eliminarMktContenidoUrlDriveSchema,
} from "@/lib/validations/mktContenidoUrlDrive";
import {
  crearMktContenidoUrlDrive,
  editarMktContenidoUrlDrive,
  eliminarMktContenidoUrlDrive,
} from "@/services/mktContenidoUrlDrive.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateBaseMultimedia(): void {
  revalidatePath(MARKETING_ROUTES.baseMultimedia.contenido);
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

export async function crearMktContenidoUrlDriveAction(
  raw: unknown
): Promise<ActionResult<MktContenidoUrlDriveItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktContenidoUrlDriveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktContenidoUrlDrive(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateBaseMultimedia();
  return { ok: true, data: res.data };
}

export async function editarMktContenidoUrlDriveAction(
  raw: unknown
): Promise<ActionResult<MktContenidoUrlDriveItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktContenidoUrlDriveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktContenidoUrlDrive(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateBaseMultimedia();
  return { ok: true, data: res.data };
}

export async function eliminarMktContenidoUrlDriveAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktContenidoUrlDriveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktContenidoUrlDrive(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateBaseMultimedia();
  return { ok: true, data: res.data };
}
