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
  marcarEntregaProveedorChequeSchema,
  transferirFinTesoreriaChequeSchema,
} from "@/lib/validations/finTesoreriaCheques";
import {
  actualizarFinTesoreriaCheque,
  crearFinTesoreriaCheque,
  eliminarFinTesoreriaCheque,
  listarChequesPorCajaId,
  marcarEntregaProveedorFinTesoreriaCheque,
  transferirChequeFinTesoreria,
  type FinTesoreriaChequeItem,
  type TransferirChequeFinTesoreriaResultado,
} from "@/services/finTesoreriaCheques.service";
import { prisma } from "@/lib/prisma";

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
    const items = await listarChequesPorCajaId(parsed.data.cajaId, parsed.data.tenenciaFiltro);
    return { ok: true, data: items };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo listar los cheques.";
    return { ok: false, error: message };
  }
}

export type ProveedorMercaderiaChequeTesoreriaOpcion = { id: string; nombre: string };

/** Listado mínimo para selects de cheques; gate `finanzas.acceso` (no exige permisos de catálogo proveedores). */
export async function listarProveedoresMercaderiaParaChequeTesoreriaAction(): Promise<
  ActionResult<ProveedorMercaderiaChequeTesoreriaOpcion[]>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }

  try {
    const rows = await prisma.proveedor.findMany({
      where: { proveedorMercaderia: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
    return { ok: true, data: rows };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "No se pudo listar proveedores de mercadería.";
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

export async function marcarEntregaProveedorFinTesoreriaChequeAction(
  raw: unknown
): Promise<ActionResult<FinTesoreriaChequeItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = marcarEntregaProveedorChequeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const res = await marcarEntregaProveedorFinTesoreriaCheque(parsed.data);
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
