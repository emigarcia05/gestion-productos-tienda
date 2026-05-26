import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaExportPxListaCx } from "@/services/exportPxListaCxDiff.service";

/** Excel `.xls` (misma convención que Exportar Cx / Stock). */
export function descargarExcelPxListaCx(filas: FilaExportPxListaCx[]): void {
  void import("xlsx").then((XLSX) => {
    const hojaFilas = filas.map((f) => ({
      CODIGO: f.codigo,
      "PORC UTILIDAD": f.importe,
    }));
    const hoja = XLSX.utils.json_to_sheet(hojaFilas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Px Marcacion");
    hoja["!cols"] = [{ wch: 18 }, { wch: 14 }];
    const nombre = `Exportar Px ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}
