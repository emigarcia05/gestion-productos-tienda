"use server";

import { revalidatePath } from "next/cache";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import type { ProdIaDisenoPrompItem } from "@/lib/asistenteIa";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  crearProdIaDisenoPrompSchema,
  editarProdIaDisenoPrompSchema,
  eliminarProdIaDisenoPrompSchema,
} from "@/lib/validations/prodIaDisenoPromp";
import {
  crearProdIaDisenoPromp,
  editarProdIaDisenoPromp,
  eliminarProdIaDisenoPromp,
  listarProdIaDisenoPromps,
} from "@/services/prodIaDisenoPromp.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateAsistenteIa(): void {
  revalidatePath(GP_ROUTES.asistenteIa.buscarColorImagen);
}

async function requireAsistenteIaLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.asistenteIa.acceso)) {
    return { ok: false, error: "Sin permisos para Asistente IA." };
  }
  return null;
}

async function requireEditorAsistenteIa(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireAsistenteIaLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

export async function listarProdIaDisenoPrompsAction(): Promise<
  ActionResult<ProdIaDisenoPrompItem[]>
> {
  const gate = await requireAsistenteIaLectura();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarProdIaDisenoPromps() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudieron listar los prompts.",
    };
  }
}

export async function crearProdIaDisenoPrompAction(
  raw: unknown,
): Promise<ActionResult<ProdIaDisenoPrompItem>> {
  const gate = await requireEditorAsistenteIa();
  if (gate) return gate;
  const parsed = crearProdIaDisenoPrompSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearProdIaDisenoPromp(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateAsistenteIa();
  return { ok: true, data: res.data };
}

export async function editarProdIaDisenoPrompAction(
  raw: unknown,
): Promise<ActionResult<ProdIaDisenoPrompItem>> {
  const gate = await requireEditorAsistenteIa();
  if (gate) return gate;
  const parsed = editarProdIaDisenoPrompSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarProdIaDisenoPromp(parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateAsistenteIa();
  return { ok: true, data: res.data };
}

export async function eliminarProdIaDisenoPrompAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorAsistenteIa();
  if (gate) return gate;
  const parsed = eliminarProdIaDisenoPrompSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarProdIaDisenoPromp(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateAsistenteIa();
  return { ok: true, data: res.data };
}
