"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  actualizarPlazoPagoComprobanteSchema,
  toggleControladoSchema,
} from "@/lib/validations/controlComprobantes";
import {
  actualizarControladoComprobante,
  actualizarPlazoPagoComprobante,
} from "@/services/controlComprobantes.service";

function revalidateComprobantesFinanzas() {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/control-comprobantes");
  revalidatePath("/finanzas/deuda-proveedores");
  revalidatePath("/finanzas/venc-por-fecha");
}

export async function actualizarControladoComprobanteAction(
  raw: unknown
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para acceder a finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = toggleControladoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos para actualizar el comprobante." };
  }

  const result = await actualizarControladoComprobante(
    parsed.data.id,
    parsed.data.controlado
  );
  if (!result.success) return { ok: false, error: result.error };

  revalidateComprobantesFinanzas();

  return { ok: true, data: undefined };
}

export async function actualizarPlazoPagoComprobanteAction(
  raw: unknown
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para acceder a finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = actualizarPlazoPagoComprobanteSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Plazo de pago inválido.";
    return { ok: false, error: msg };
  }

  const result = await actualizarPlazoPagoComprobante(
    parsed.data.id,
    parsed.data.plazoPagoDias
  );
  if (!result.success) return { ok: false, error: result.error };

  revalidateComprobantesFinanzas();

  return { ok: true, data: undefined };
}
