"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  actualizarFinTesoreriaChequeSchema,
  crearFinTesoreriaChequeSchema,
  eliminarFinTesoreriaChequeSchema,
  listarFinTesoreriaChequesPorCajaSchema,
  transferirFinTesoreriaChequeSchema,
} from "@/lib/validations/finTesoreriaCheques";
import {
  actualizarFinTesoreriaCheque,
  crearFinTesoreriaCheque,
  eliminarFinTesoreriaCheque,
  listarChequesPorCajaId,
  transferirChequeFinTesoreria,
  type FinTesoreriaChequeItem,
  type TransferirChequeFinTesoreriaResultado,
} from "@/services/finTesoreriaCheques.service";

function revalidateFinTesoreriaChequesMutations(): void {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/tesoreria");
  revalidatePath("/finanzas/venc-por-fecha");
}

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

export async function listarChequesPorCajaAction(
  raw: unknown
): Promise<ActionResult<FinTesoreriaChequeItem[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }

  const parsed = listarFinTesoreriaChequesPorCajaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  try {
    const items = await listarChequesPorCajaId(parsed.data.cajaId);
    return { ok: true, data: items };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo listar los cheques.";
    return { ok: false, error: message };
  }
}

export async function crearFinTesoreriaChequeAction(
  raw: unknown
): Promise<ActionResult<FinTesoreriaChequeItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = crearFinTesoreriaChequeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await crearFinTesoreriaCheque(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidateFinTesoreriaChequesMutations();
  return { ok: true, data: res.data };
}

export async function transferirFinTesoreriaChequeAction(
  raw: unknown
): Promise<ActionResult<TransferirChequeFinTesoreriaResultado>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = transferirFinTesoreriaChequeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await transferirChequeFinTesoreria(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidateFinTesoreriaChequesMutations();
  return { ok: true, data: res.data };
}

export async function actualizarFinTesoreriaChequeAction(
  raw: unknown
): Promise<ActionResult<FinTesoreriaChequeItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = actualizarFinTesoreriaChequeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await actualizarFinTesoreriaCheque(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidateFinTesoreriaChequesMutations();
  return { ok: true, data: res.data };
}

export async function eliminarFinTesoreriaChequeAction(raw: unknown): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = eliminarFinTesoreriaChequeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await eliminarFinTesoreriaCheque(parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };

  revalidateFinTesoreriaChequesMutations();
  return { ok: true, data: undefined };
}
