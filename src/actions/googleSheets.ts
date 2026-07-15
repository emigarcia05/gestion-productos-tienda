"use server";

import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  probarConexionGoogleSheets,
  type GoogleSheetsProbeResult,
} from "@/services/googleSheetsProbe.service";

/**
 * Probe de conexión Google Sheets (solo editor).
 * Escribe una marca en A1 del spreadsheet configurado por ENV.
 */
export async function probarConexionGoogleSheetsAction(): Promise<
  ActionResult<GoogleSheetsProbeResult>
> {
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  try {
    const res = await probarConexionGoogleSheets();
    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo probar la conexión con Google Sheets.",
    };
  }
}
