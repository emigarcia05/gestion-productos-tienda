/**
 * Auth Google (service account) para Sheets / Drive.
 * ENV: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID.
 */

import { google } from "googleapis";
import type { JWT } from "google-auth-library";

/** Vercel suele guardar la clave con `\n` literales; el JWT necesita saltos reales. */
export function normalizeGooglePrivateKey(raw: string): string {
  return raw.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
}

export type GoogleSheetsEnvConfig = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
};

export function getGoogleSheetsEnvConfig():
  | { ok: true; data: GoogleSheetsEnvConfig }
  | { ok: false; error: string } {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY?.trim() ?? "";
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? "";

  if (!clientEmail) {
    return { ok: false, error: "Falta GOOGLE_SERVICE_ACCOUNT_EMAIL." };
  }
  if (!privateKeyRaw) {
    return { ok: false, error: "Falta GOOGLE_PRIVATE_KEY." };
  }
  if (!spreadsheetId) {
    return { ok: false, error: "Falta GOOGLE_SHEETS_SPREADSHEET_ID." };
  }

  return {
    ok: true,
    data: {
      clientEmail,
      privateKey: normalizeGooglePrivateKey(privateKeyRaw),
      spreadsheetId,
    },
  };
}

const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
] as const;

export function createGoogleSheetsAuth(config: GoogleSheetsEnvConfig): JWT {
  return new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [...SHEETS_SCOPES],
  });
}

export function createSheetsClient(auth: JWT) {
  return google.sheets({ version: "v4", auth });
}

export function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
