import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaExportPx, ResumenAumentosPromedioPxExport } from "@/lib/exportPxDiffTypes";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";

/** Excel `.xls` (misma convención que Exportar Cx). */
export async function descargarExcelPx(filas: FilaExportPx[]): Promise<void> {
  const XLSX = await import("xlsx");
  const hojaFilas = filas.map((f) => ({
    CODIGO: f.codigo,
    Importe: f.marcacion,
  }));
  const hoja = XLSX.utils.json_to_sheet(hojaFilas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Px Listas");
  hoja["!cols"] = [{ wch: 18 }, { wch: 16 }];
  const nombre = `Exportar Px ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
  XLSX.writeFile(libro, nombre, { bookType: "xls" });
}

function esperarMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Descarga Excel y PDF en secuencia (evita que el navegador bloquee la segunda descarga).
 * El PDF se genera en el cliente con jsPDF.
 */
export async function descargarExportPxCompleto(
  filas: FilaExportPx[],
  resumenAumentos: ResumenAumentosPromedioPxExport
): Promise<void> {
  await descargarExcelPx(filas);
  await esperarMs(350);
  await descargarPdfResumenAumentosPx(resumenAumentos);
}
