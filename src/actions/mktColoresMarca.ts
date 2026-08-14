"use server";

import { firstZodErrorMessage, requireEditorMarketing } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktColorMarcaItem } from "@/lib/mktColoresMarca";
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
} from "@/services/mktColoresMarca.service";

function revalidateColoresMarca(): void {
  revalidatePath(MARKETING_ROUTES.baseMultimedia.coloresMarca);
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
