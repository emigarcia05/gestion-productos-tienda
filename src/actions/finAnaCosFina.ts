"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import { actualizarFinAnaCosFinaSchema } from "@/lib/validations/finAnaCosFina";
import {
  crearFinAnaCosFinaTerminalSchema,
  editarFinAnaCosFinaTerminalSchema,
  eliminarFinAnaCosFinaTerminalSchema,
} from "@/lib/validations/finAnaCosFinaTerminal";
import {
  actualizarFinAnaCosFina,
  type FinAnaCosFinaItem,
} from "@/services/finAnaCosFina.service";
import {
  crearFinAnaCosFinaTerminal,
  editarFinAnaCosFinaTerminal,
  eliminarFinAnaCosFinaTerminal,
  listarFinAnaCosFinaTerminales,
} from "@/services/finAnaCosFinaTerminal.service";

const RUTA_COSTOS_FINANCIEROS = "/finanzas/analisis-mc/costos-financieros";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

async function requireFinanzasLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  return null;
}

async function requireEditorFinanzas(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

export async function listarFinAnaCosFinaTerminalesAction(): Promise<
  ActionResult<FinAnaCosFinaTerminalItem[]>
> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;

  try {
    const data = await listarFinAnaCosFinaTerminales();
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No se pudieron cargar las terminales." };
  }
}

export async function crearFinAnaCosFinaTerminalAction(
  raw: unknown
): Promise<ActionResult<FinAnaCosFinaTerminalItem>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = crearFinAnaCosFinaTerminalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await crearFinAnaCosFinaTerminal(parsed.data);
  if (!res.success) {
    return { ok: false, error: res.error };
  }

  revalidatePath(RUTA_COSTOS_FINANCIEROS);
  return { ok: true, data: res.data };
}

export async function editarFinAnaCosFinaTerminalAction(
  raw: unknown
): Promise<ActionResult<FinAnaCosFinaTerminalItem>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = editarFinAnaCosFinaTerminalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await editarFinAnaCosFinaTerminal(parsed.data);
  if (!res.success) {
    return { ok: false, error: res.error };
  }

  revalidatePath(RUTA_COSTOS_FINANCIEROS);
  return { ok: true, data: res.data };
}

export async function eliminarFinAnaCosFinaTerminalAction(raw: unknown): Promise<ActionResult<void>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = eliminarFinAnaCosFinaTerminalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await eliminarFinAnaCosFinaTerminal(parsed.data.id);
  if (!res.success) {
    return { ok: false, error: res.error };
  }

  revalidatePath(RUTA_COSTOS_FINANCIEROS);
  return { ok: true, data: undefined };
}

export async function actualizarFinAnaCosFinaAction(
  raw: unknown
): Promise<ActionResult<FinAnaCosFinaItem>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = actualizarFinAnaCosFinaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  try {
    const data = await actualizarFinAnaCosFina(parsed.data);
    revalidatePath(RUTA_COSTOS_FINANCIEROS);
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No se pudo actualizar el costo financiero." };
  }
}
