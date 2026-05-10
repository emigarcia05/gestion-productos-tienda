"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import {
  listarDetalleIvaCreditoComprasMercaderiaMes,
  listarDetalleIvaCreditoGastosMes,
  type DetalleLineaIvaCreditoBalance,
  type DetalleLineaIvaCreditoCompraMercaderia,
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

async function parseMesAnio(
  raw: unknown,
): Promise<{ ok: true; data: { mes: number; anio: number } } | { ok: false; error: string }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }

  const parsed = mesAnioQuerySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  return { ok: true, data: parsed.data };
}

/** Detalle IVA crédito · gastos balance (`iva = true`) para un mes/año. */
export async function listarDetalleIvaCreditoGastosMesAction(
  raw: unknown,
): Promise<ActionResult<DetalleLineaIvaCreditoBalance[]>> {
  const parsed = await parseMesAnio(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const data = await listarDetalleIvaCreditoGastosMes(parsed.data);
  return { ok: true, data };
}

/** Detalle IVA crédito · compras mercadería (facturas) para un mes/año. */
export async function listarDetalleIvaCreditoComprasMercaderiaMesAction(
  raw: unknown,
): Promise<ActionResult<DetalleLineaIvaCreditoCompraMercaderia[]>> {
  const parsed = await parseMesAnio(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const data = await listarDetalleIvaCreditoComprasMercaderiaMes(parsed.data);
  return { ok: true, data };
}
