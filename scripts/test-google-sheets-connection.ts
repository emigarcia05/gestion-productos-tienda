/**
 * Prueba local de conexión a Google Sheets (service account).
 * Requiere en `.env`: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID.
 *
 * Ejecutar: npm run test:google-sheets
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { probarConexionGoogleSheets } = await import(
    "../src/services/googleSheetsProbe.service"
  );

  console.log("Probando conexión a Google Sheets...");
  const res = await probarConexionGoogleSheets();
  if (!res.success) {
    console.error("✗ Falló:", res.error);
    process.exit(1);
  }

  console.log("✓ Conexión OK.");
  console.log("  Título:", res.data.spreadsheetTitle);
  console.log("  Celda A1:", res.data.cellValue);
  console.log("  URL:", res.data.url);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
