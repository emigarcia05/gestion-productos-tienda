import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaExcelTransfDepositosDto } from "@/actions/stock";

/**
 * Excel DUX para transferencias entre depósitos:
 * COD. | TIPO MOVIMIENTO (EGRESO/INGRESO) | CANTIDAD DISPONIBLE
 */
export function descargarExcelTransfDepositos(
  filas: FilaExcelTransfDepositosDto[],
  sucursalLabel: string
): void {
  void import("xlsx").then((XLSX) => {
    const hojaFilas = filas.map((f) => ({
      "COD.": f.cod,
      "TIPO MOVIMIENTO": f.tipoMovimiento,
      "CANTIDAD DISPONIBLE": f.cantidad,
    }));
    const hoja = XLSX.utils.json_to_sheet(hojaFilas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Transferencias");
    hoja["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 22 }];
    const nombre = `Transf ${sucursalLabel} ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}
