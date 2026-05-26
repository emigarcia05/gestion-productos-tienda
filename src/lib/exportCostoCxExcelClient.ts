import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaExportCostoCx } from "@/services/exportCostoCxDiff.service";

/** Excel `.xls` (misma convención que Stock). */
export function descargarExcelCostoCx(filas: FilaExportCostoCx[]): void {
  void import("xlsx").then((XLSX) => {
    const hojaFilas = filas.map((f) => ({
      CODIGO: f.codigo,
      COSTO: f.costo,
    }));
    const hoja = XLSX.utils.json_to_sheet(hojaFilas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Costo Cx");
    hoja["!cols"] = [{ wch: 18 }, { wch: 14 }];
    const nombre = `Exportar Cx ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}
