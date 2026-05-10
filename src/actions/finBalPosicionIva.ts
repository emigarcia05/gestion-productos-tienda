"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import {
  listarDetalleIvaCreditoMes,
  type DetalleLineaIvaCreditoBalance,
} from "@/services/finBalPosicionIva.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

/** Detalle de líneas con IVA crédito para un mes/año (Balance · Posición de IVA). */
export async function listarDetalleIvaCreditoMesAction(
  raw: unknown,
): Promise<ActionResult<DetalleLineaIvaCreditoBalance[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }

  const parsed = mesAnioQuerySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const data = await listarDetalleIvaCreditoMes(parsed.data);
  return { ok: true, data };
}
