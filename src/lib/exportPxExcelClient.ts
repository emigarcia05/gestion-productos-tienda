import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaExportPx } from "@/services/exportPxDiff.service";

/** Excel `.xls` (misma convención que Exportar Cx). */
export function descargarExcelPx(filas: FilaExportPx[]): void {
  void import("xlsx").then((XLSX) => {
    const hojaFilas = filas.map((f) => ({
      CODIGO: f.codigo,
      IMPORTE: f.importe,
    }));
    const hoja = XLSX.utils.json_to_sheet(hojaFilas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Px Listas");
    hoja["!cols"] = [{ wch: 18 }, { wch: 16 }];
    const nombre = `Exportar Px ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}
