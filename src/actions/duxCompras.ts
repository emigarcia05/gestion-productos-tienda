"use server";

import { z } from "zod";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  fechaDuxCompraSchema,
  getSiguienteComprobanteDuxCompra,
  siguienteComprobanteDuxParamsSchema,
  type SiguienteComprobanteResult,
} from "@/services/duxCompras.service";

const exportSiguienteComprobanteSchema = siguienteComprobanteDuxParamsSchema;

export async function getSiguienteComprobanteDuxCompraAction(
  params: z.infer<typeof exportSiguienteComprobanteSchema>
): Promise<ActionResult<SiguienteComprobanteResult>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = exportSiguienteComprobanteSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };

  try {
    const data = await getSiguienteComprobanteDuxCompra(parsed.data);
    return { ok: true, data };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al consultar DUX.";
    return { ok: false, error: message };
  }
}

// Helper para que el cliente valide el payload si lo necesita (sin duplicar lógica).
export const siguienteComprobanteDuxCompraParamsSchema = fechaDuxCompraSchema;

