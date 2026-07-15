import { prisma } from "@/lib/prisma";
import {
  openGoogleSheetsClient,
  replaceGoogleSheetTabValues,
} from "@/lib/googleSheetsWrite";
import type { ServiceResult } from "@/types/service.types";

/** Nombre de la pestaña en el spreadsheet fijo. */
export const GOOGLE_SHEET_TAB_SECCIONES = "Secciones";

export type ExportMktSeccionesGoogleSheetsResult = {
  spreadsheetId: string;
  url: string;
  sheetTitle: string;
  filasDatos: number;
};

/**
 * Exporta `mkt_publi_ideas_secciones` → pestaña **Secciones**.
 * Columnas: id | idea_nombre | idea_resumen. Sobrescribe toda la pestaña.
 */
export async function exportarMktSeccionesAGoogleSheets(): Promise<
  ServiceResult<ExportMktSeccionesGoogleSheetsResult>
> {
  const client = openGoogleSheetsClient();
  if (!client.ok) return { success: false, error: client.error };

  const { config, sheets, url } = client.data;

  try {
    const rows = await prisma.mktPublicacionIdeaSeccion.findMany({
      select: {
        id: true,
        ideaNombre: true,
        ideaResumen: true,
      },
      orderBy: { ideaNombre: "asc" },
    });

    const values: string[][] = [
      ["id", "idea_nombre", "idea_resumen"],
      ...rows.map((r) => [r.id, r.ideaNombre, r.ideaResumen ?? ""]),
    ];

    await replaceGoogleSheetTabValues(
      sheets,
      config.spreadsheetId,
      GOOGLE_SHEET_TAB_SECCIONES,
      values
    );

    return {
      success: true,
      data: {
        spreadsheetId: config.spreadsheetId,
        url,
        sheetTitle: GOOGLE_SHEET_TAB_SECCIONES,
        filasDatos: rows.length,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al exportar a Google Sheets.";
    return {
      success: false,
      error: `No se pudo exportar Secciones: ${message}`,
    };
  }
}
