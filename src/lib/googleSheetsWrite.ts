/**
 * Helpers de escritura en un Google Spreadsheet (sobrescribe pestaña).
 */

import type { sheets_v4 } from "googleapis";
import {
  createGoogleSheetsAuth,
  createSheetsClient,
  getGoogleSheetsEnvConfig,
  spreadsheetUrl,
  type GoogleSheetsEnvConfig,
} from "@/lib/googleSheets";

export type GoogleSheetsClientBundle = {
  config: GoogleSheetsEnvConfig;
  sheets: sheets_v4.Sheets;
  url: string;
};

export function openGoogleSheetsClient():
  | { ok: true; data: GoogleSheetsClientBundle }
  | { ok: false; error: string } {
  const env = getGoogleSheetsEnvConfig();
  if (!env.ok) return env;
  const auth = createGoogleSheetsAuth(env.data);
  const sheets = createSheetsClient(auth);
  return {
    ok: true,
    data: {
      config: env.data,
      sheets,
      url: spreadsheetUrl(env.data.spreadsheetId),
    },
  };
}

/** Crea la pestaña si no existe (mismo workbook). */
export async function ensureGoogleSheetTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const exists = (meta.data.sheets ?? []).some(
    (s) => (s.properties?.title ?? "").trim() === sheetTitle
  );
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetTitle } } }],
    },
  });
}

/**
 * Limpia la pestaña y escribe `values` desde A1.
 * `values[0]` suele ser el encabezado.
 */
export async function replaceGoogleSheetTabValues(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetTitle: string,
  values: string[][]
): Promise<void> {
  await ensureGoogleSheetTab(sheets, spreadsheetId, sheetTitle);
  const quoted = `'${sheetTitle.replace(/'/g, "''")}'`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: quoted,
  });

  if (values.length === 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoted}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}
