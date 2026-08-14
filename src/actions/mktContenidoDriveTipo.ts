"use server";

import { firstZodErrorMessage, requireEditorMarketing, requireMarketingLectura } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktContenidoDriveTipoItem } from "@/lib/mktContenidoUrlDrive";
import type { ActionResult } from "@/lib/types";
import {
  crearMktContenidoDriveTipoSchema,
  editarMktContenidoDriveTipoSchema,
  eliminarMktContenidoDriveTipoSchema,
} from "@/lib/validations/mktContenidoDriveTipo";
import {
  crearMktContenidoDriveTipo,
  editarMktContenidoDriveTipo,
  eliminarMktContenidoDriveTipo,
  listarMktContenidoDriveTipos,
} from "@/services/mktContenidoDriveTipo.service";

function revalidateBaseMultimedia(): void {
  revalidatePath(MARKETING_ROUTES.baseMultimedia.contenido);
}

export async function listarMktContenidoDriveTiposAction(): Promise<
  ActionResult<MktContenidoDriveTipoItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktContenidoDriveTipos() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar los tipos.",
    };
  }
}

export async function crearMktContenidoDriveTipoAction(
  raw: unknown
): Promise<ActionResult<MktContenidoDriveTipoItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktContenidoDriveTipoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktContenidoDriveTipo(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateBaseMultimedia();
  return { ok: true, data: res.data };
}

export async function editarMktContenidoDriveTipoAction(
  raw: unknown
): Promise<ActionResult<MktContenidoDriveTipoItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktContenidoDriveTipoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktContenidoDriveTipo(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateBaseMultimedia();
  return { ok: true, data: res.data };
}

export async function eliminarMktContenidoDriveTipoAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktContenidoDriveTipoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktContenidoDriveTipo(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateBaseMultimedia();
  return { ok: true, data: res.data };
}
