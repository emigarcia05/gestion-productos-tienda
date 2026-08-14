"use server";

import { firstZodErrorMessage, requireEditorMarketing, requireMarketingLectura } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { ActionResult } from "@/lib/types";
import {
  crearMktCatalogoNombreSchema,
  editarMktCatalogoNombreSchema,
  eliminarMktCatalogoNombreSchema,
} from "@/lib/validations/mktPublicacionesCatalogo";
import {
  crearMktPublicacionContenido,
  crearMktPublicacionRed,
  editarMktPublicacionContenido,
  editarMktPublicacionRed,
  eliminarMktPublicacionContenido,
  eliminarMktPublicacionRed,
  listarMktPublicacionContenidos,
  listarMktPublicacionRedes,
} from "@/services/mktPublicacionesCatalogo.service";

function revalidateMarketingPublicaciones(): void {
  revalidatePath(MARKETING_ROUTES.publicaciones.calendario);
  revalidatePath(MARKETING_ROUTES.publicaciones.ideas);
}

// ─── Redes ───────────────────────────────────────────────────────────────────

export async function listarMktPublicacionRedesAction(): Promise<
  ActionResult<MktCatalogoNombreItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktPublicacionRedes() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar las redes.",
    };
  }
}

export async function crearMktPublicacionRedAction(
  raw: unknown
): Promise<ActionResult<MktCatalogoNombreItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktPublicacionRed(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateMarketingPublicaciones();
  return { ok: true, data: res.data };
}

export async function editarMktPublicacionRedAction(
  raw: unknown
): Promise<ActionResult<MktCatalogoNombreItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktPublicacionRed(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateMarketingPublicaciones();
  return { ok: true, data: res.data };
}

export async function eliminarMktPublicacionRedAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktPublicacionRed(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateMarketingPublicaciones();
  return { ok: true, data: res.data };
}

// ─── Tipos de contenido ──────────────────────────────────────────────────────

export async function listarMktPublicacionContenidosAction(): Promise<
  ActionResult<MktCatalogoNombreItem[]>
> {
  const gate = await requireMarketingLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarMktPublicacionContenidos() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar los tipos de contenido.",
    };
  }
}

export async function crearMktPublicacionContenidoAction(
  raw: unknown
): Promise<ActionResult<MktCatalogoNombreItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = crearMktCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearMktPublicacionContenido(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateMarketingPublicaciones();
  return { ok: true, data: res.data };
}

export async function editarMktPublicacionContenidoAction(
  raw: unknown
): Promise<ActionResult<MktCatalogoNombreItem>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = editarMktCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarMktPublicacionContenido(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateMarketingPublicaciones();
  return { ok: true, data: res.data };
}

export async function eliminarMktPublicacionContenidoAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  const parsed = eliminarMktCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarMktPublicacionContenido(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateMarketingPublicaciones();
  return { ok: true, data: res.data };
}
