"use server";

import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktColorMarcaItem } from "@/lib/mktColoresMarca";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  crearMktColorMarcaSchema,
  editarMktColorMarcaSchema,
  eliminarMktColorMarcaSchema,
} from "@/lib/validations/mktColoresMarca";
import {
  crearMktColorMarca,
  editarMktColorMarca,
  eliminarMktColorMarca,
  listarMktColoresMarca,
} from "@/services/mktColoresMarca.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateColoresMarca(): void {
  revalidatePath(MARKETING_ROUTES.baseMultimedia.coloresMarca);
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

export async function listarMktColoresMarcaAction(): Promise<
  ActionResult<MktColorMarcaItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktColoresMarca() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar los registros.",
    };
  }
}

export async function crearMktColorMarcaAction(
  raw: unknown
): Promise<ActionResult<MktColorMarcaItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktColorMarcaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktColorMarca(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateColoresMarca();
  return { ok: true, data: res.data };
}

export async function editarMktColorMarcaAction(
  raw: unknown
): Promise<ActionResult<MktColorMarcaItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktColorMarcaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktColorMarca(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateColoresMarca();
  return { ok: true, data: res.data };
}

export async function eliminarMktColorMarcaAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktColorMarcaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktColorMarca(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateColoresMarca();
  return { ok: true, data: res.data };
}
