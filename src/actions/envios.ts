"use server";

import { revalidatePath } from "next/cache";
import { requireEnvios } from "@/lib/actionGates";
import type {
  EnviosDireccionItem,
  EnviosFinalListItem,
  EnviosPersonaItem,
} from "@/lib/envios";
import { REVALIDATE_ENVIOS } from "@/lib/gestionProductosRoutes";
import type { ActionResult } from "@/lib/types";
import {
  crearEnviosDireccionSchema,
  crearEnviosFinalSchema,
  crearEnviosPersonaSchema,
  editarEnviosDireccionSchema,
  editarEnviosFinalSchema,
  editarEnviosPersonaSchema,
  eliminarEnviosDireccionSchema,
  eliminarEnviosFinalSchema,
  eliminarEnviosPersonaSchema,
} from "@/lib/validations/envios";
import {
  crearEnviosDireccion,
  editarEnviosDireccion,
  eliminarEnviosDireccion,
  listarEnviosDirecciones,
} from "@/services/enviosDirecciones.service";
import {
  crearEnviosFinal,
  editarEnviosFinal,
  eliminarEnviosFinal,
} from "@/services/enviosFinal.service";
import {
  crearEnviosPersona,
  editarEnviosPersona,
  eliminarEnviosPersona,
  listarEnviosPersonas,
} from "@/services/enviosPersonas.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateEnvios(): void {
  for (const path of REVALIDATE_ENVIOS) {
    revalidatePath(path);
  }
}

export async function listarEnviosPersonasAction(): Promise<ActionResult<EnviosPersonaItem[]>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarEnviosPersonas() };
  } catch (e) {
    console.error("[listarEnviosPersonasAction]", e);
    return { ok: false, error: "No se pudieron listar las personas." };
  }
}

export async function crearEnviosPersonaAction(
  raw: unknown
): Promise<ActionResult<EnviosPersonaItem>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = crearEnviosPersonaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await crearEnviosPersona(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[crearEnviosPersonaAction]", e);
    return { ok: false, error: "No se pudo crear la persona." };
  }
}

export async function editarEnviosPersonaAction(
  raw: unknown
): Promise<ActionResult<EnviosPersonaItem>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = editarEnviosPersonaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await editarEnviosPersona(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[editarEnviosPersonaAction]", e);
    return { ok: false, error: "No se pudo actualizar la persona." };
  }
}

export async function eliminarEnviosPersonaAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = eliminarEnviosPersonaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await eliminarEnviosPersona(parsed.data.id);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[eliminarEnviosPersonaAction]", e);
    return { ok: false, error: "No se pudo eliminar la persona." };
  }
}

export async function listarEnviosDireccionesAction(): Promise<
  ActionResult<EnviosDireccionItem[]>
> {
  const gate = await requireEnvios();
  if (gate) return gate;
  try {
    return { ok: true, data: await listarEnviosDirecciones() };
  } catch (e) {
    console.error("[listarEnviosDireccionesAction]", e);
    return { ok: false, error: "No se pudieron listar las direcciones." };
  }
}

export async function crearEnviosDireccionAction(
  raw: unknown
): Promise<ActionResult<EnviosDireccionItem>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = crearEnviosDireccionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await crearEnviosDireccion(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[crearEnviosDireccionAction]", e);
    return { ok: false, error: "No se pudo crear la dirección." };
  }
}

export async function editarEnviosDireccionAction(
  raw: unknown
): Promise<ActionResult<EnviosDireccionItem>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = editarEnviosDireccionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await editarEnviosDireccion(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[editarEnviosDireccionAction]", e);
    return { ok: false, error: "No se pudo actualizar la dirección." };
  }
}

export async function eliminarEnviosDireccionAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = eliminarEnviosDireccionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await eliminarEnviosDireccion(parsed.data.id);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[eliminarEnviosDireccionAction]", e);
    return { ok: false, error: "No se pudo eliminar la dirección." };
  }
}

export async function crearEnviosFinalAction(
  raw: unknown
): Promise<ActionResult<EnviosFinalListItem>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = crearEnviosFinalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await crearEnviosFinal(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[crearEnviosFinalAction]", e);
    return { ok: false, error: "No se pudo crear el envío." };
  }
}

export async function editarEnviosFinalAction(
  raw: unknown
): Promise<ActionResult<EnviosFinalListItem>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = editarEnviosFinalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await editarEnviosFinal(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[editarEnviosFinalAction]", e);
    return { ok: false, error: "No se pudo actualizar el envío." };
  }
}

export async function eliminarEnviosFinalAction(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEnvios();
  if (gate) return gate;
  const parsed = eliminarEnviosFinalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };
  try {
    const res = await eliminarEnviosFinal(parsed.data.id);
    if (!res.success) return { ok: false, error: res.error };
    revalidateEnvios();
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[eliminarEnviosFinalAction]", e);
    return { ok: false, error: "No se pudo eliminar el envío." };
  }
}
