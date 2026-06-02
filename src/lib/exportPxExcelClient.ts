import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaExportPx } from "@/lib/exportPxDiffTypes";

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
