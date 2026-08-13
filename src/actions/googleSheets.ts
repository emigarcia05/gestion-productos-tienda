"use server";

import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  exportarMktAGoogleSheets,
  type ExportMktGoogleSheetsResult,
} from "@/services/googleSheetsExportMktSecciones.service";

/**
 * Exporta Marketing a Google Sheets (solo editor): Secciones, Redes,
 * Tipo de Contenido, Ideas y Publicaciones (sobrescribe cada pestaña).
 */
export async function exportarMktGoogleSheetsAction(): Promise<
  ActionResult<ExportMktGoogleSheetsResult>
> {
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  try {
    const res = await exportarMktAGoogleSheets();
    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo exportar a Google Sheets.",
    };
  }
}
