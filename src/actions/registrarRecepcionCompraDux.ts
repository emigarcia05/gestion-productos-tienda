"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { puede, PERMISOS } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  fechaFacturaIsoSchema,
  ERROR_REQUIERE_DECISION_FISCAL,
} from "@/services/exportRecepcionPedidoExcel.service";
import { registrarRecepcionCompraDux } from "@/services/registrarRecepcionCompraDux.service";

const registrarRecepcionCompraDuxSchema = z.object({
  pedidoHistoriaId: z.string().cuid("ID inválido."),
  fechaFacturaIso: fechaFacturaIsoSchema,
  totalPedidoIngreso: z.coerce
    .number()
    .finite()
    .refine((n) => n !== 0)
    .optional(),
  decisionFiscal: z.boolean().optional(),
  idPersonal: z.coerce.number().int().positive().optional(),
});

export async function registrarRecepcionCompraDuxAction(
  params: unknown
): Promise<
  ActionResult<{ idCompra: number | null; nroComprobante: string }>
> {
  try {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = registrarRecepcionCompraDuxSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };

    const res = await registrarRecepcionCompraDux({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
      fechaFacturaIso: parsed.data.fechaFacturaIso,
      totalPedidoIngreso: parsed.data.totalPedidoIngreso,
      decisionFiscal: parsed.data.decisionFiscal,
      idPersonal: parsed.data.idPersonal,
    });

    if (!res.success) {
      if (res.error === ERROR_REQUIERE_DECISION_FISCAL) {
        return { ok: false, error: ERROR_REQUIERE_DECISION_FISCAL };
      }
      return { ok: false, error: res.error };
    }

    return { ok: true, data: res.data };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[registrarRecepcionCompraDux][action]", message);
    return {
      ok: false,
      error: "Error inesperado al registrar la compra en DUX.",
    };
  }
}
