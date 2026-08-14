"use server";

import {
  mensajeErrorAction,
  requireEditorMarketing,
} from "@/lib/actionHelpers";
import type { ActionResult } from "@/lib/types";
import {
  exportarMktAGoogleSheets,
  type ExportMktGoogleSheetsResult,
} from "@/services/googleSheetsExportMktSecciones.service";

/**
 * Exporta Marketing a Google Sheets (módulo + editor): Secciones, Redes,
 * Tipo de Contenido, Ideas y Publicaciones (sobrescribe cada pestaña).
 * Probe de conexión: script `npm run test:google-sheets` → `probarConexionGoogleSheets`.
 */
export async function exportarMktGoogleSheetsAction(): Promise<
  ActionResult<ExportMktGoogleSheetsResult>
> {
  const gate = await requireEditorMarketing();
  if (gate) return gate;
  try {
    const res = await exportarMktAGoogleSheets();
    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  } catch (e) {
    return {
      ok: false,
      error: mensajeErrorAction(e, "No se pudo exportar a Google Sheets."),
    };
  }
}
