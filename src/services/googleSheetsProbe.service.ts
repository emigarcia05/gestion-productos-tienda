import {
  createGoogleSheetsAuth,
  createSheetsClient,
  getGoogleSheetsEnvConfig,
  spreadsheetUrl,
} from "@/lib/googleSheets";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types/service.types";

export type GoogleSheetsProbeResult = {
  spreadsheetId: string;
  spreadsheetTitle: string;
  url: string;
  writtenAtIso: string;
  cellValue: string;
};

/**
 * Prueba de conexión: escribe en A1 del Sheet configurado.
 * No exporta datos de negocio; solo valida credenciales + permisos.
 */
export async function probarConexionGoogleSheets(): Promise<
  ServiceResult<GoogleSheetsProbeResult>
> {
  const env = getGoogleSheetsEnvConfig();
  if (!env.ok) return { success: false, error: env.error };

  const { spreadsheetId } = env.data;
  const writtenAtIso = new Date().toISOString();
  const diaAr = dateToIsoYmdArgentina(new Date());
  const cellValue = `OK conexion · ${diaAr} · ${writtenAtIso}`;

  try {
    const auth = createGoogleSheetsAuth(env.data);
    const sheets = createSheetsClient(auth);

    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties.title",
    });
    const spreadsheetTitle = meta.data.properties?.title?.trim() || "(sin título)";

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [[cellValue]],
      },
    });

    return {
      success: true,
      data: {
        spreadsheetId,
        spreadsheetTitle,
        url: spreadsheetUrl(spreadsheetId),
        writtenAtIso,
        cellValue,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al hablar con Google Sheets.";
    return {
      success: false,
      error: `No se pudo conectar con Google Sheets: ${message}`,
    };
  }
}
