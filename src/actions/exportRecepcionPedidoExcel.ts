"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { puede, PERMISOS } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  fechaFacturaIsoSchema,
  getExportRecepcionPedidoExcelPayload,
} from "@/services/exportRecepcionPedidoExcel.service";
import type { ExportRecepcionPedidoExcelPayload } from "@/services/exportRecepcionPedidoExcel.service";

const exportRecepcionPedidoExcelSchema = z.object({
  pedidoHistoriaId: z.string().cuid("ID inválido."),
  fechaFacturaIso: fechaFacturaIsoSchema,
  totalPedidoIngreso: z.coerce.number().positive().optional(),
  /**
   * SI/NO del modal "¿La compra genera comprobante fiscal?".
   * Solo aplica cuando `proveedor.iva === PREGUNTA`. Para `SIEMPRE`/`NUNCA`
   * la regla del enum prevalece (ver `resolverTipoComprobantePorIva`).
   */
  decisionFiscal: z.boolean().optional(),
});

export async function exportarExcelRecepcionPedidoAction(
  params: unknown
): Promise<ActionResult<{ excelBase64: string; filename: string }>> {
  try {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = exportRecepcionPedidoExcelSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };

    const payloadRes = await getExportRecepcionPedidoExcelPayload({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
      fechaFacturaIso: parsed.data.fechaFacturaIso,
      totalPedidoIngreso: parsed.data.totalPedidoIngreso,
      decisionFiscal: parsed.data.decisionFiscal,
    });

    if (!payloadRes.success) return { ok: false, error: payloadRes.error };

    const payload: ExportRecepcionPedidoExcelPayload = payloadRes.data;

    const XLSX = await import("xlsx");
    const hoja = XLSX.utils.json_to_sheet(payload.rows);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, payload.sheetName);

    // Excel 97-2003 => `bookType: "xls"`.
    const buffer = XLSX.write(libro, { type: "buffer", bookType: "xls" });
    const excelBase64 = Buffer.from(buffer).toString("base64");

    return { ok: true, data: { excelBase64, filename: payload.filename } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[exportRecepcionPedidoExcel][action]", message);
    return {
      ok: false,
      error: "Error inesperado al generar el Excel de recepción.",
    };
  }
}

