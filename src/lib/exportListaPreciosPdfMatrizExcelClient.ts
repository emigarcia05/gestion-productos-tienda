import { formatDdMmYyHhMmNombreArchivoArgentina } from "@/lib/fechaArgentina";
import type { FilaPdfMatrizNormalizadaDto } from "@/lib/validations/parseListaPreciosPdfMatriz";

/** Excel `.xls` (misma convención que export Px / Cx). */
export function descargarExcelListaPreciosPdfMatriz(
  filas: FilaPdfMatrizNormalizadaDto[],
  opts?: { prefijoProveedor?: string }
): void {
  void import("xlsx").then((XLSX) => {
    const hojaFilas = filas.map((f) => ({
      DESCRIPCION: f.descripcionExport,
      PRECIO: f.precio,
    }));
    const hoja = XLSX.utils.json_to_sheet(hojaFilas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Lista Precios");
    hoja["!cols"] = [{ wch: 52 }, { wch: 14 }];
    const prefijo = opts?.prefijoProveedor?.trim();
    const sufijo = prefijo ? ` ${prefijo}` : "";
    const nombre = `Lista Precios PDF${sufijo} ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}
