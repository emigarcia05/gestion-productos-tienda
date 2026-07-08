import { formatDdMmHhMmResumenAumentosArgentina } from "@/lib/fechaArgentina";
import { PORC_UTILIDAD_PX_LISTA_EXCEL_NUMFMT } from "@/lib/pxListasPreciosFormat";
import type { ExportPxListaMargenGrupo } from "@/services/exportPxListasMargen.service";

const INTERVALO_DESCARGAS_MS = 350;
const COL_PORC_UTILIDAD = 1;

/** Aplica formato numérico es-AR (coma decimal, 2 decimales) a la columna PORC UTILIDAD. */
function aplicarFormatoPorcUtilidadPxLista(
  hoja: import("xlsx").WorkSheet,
  XLSX: typeof import("xlsx")
): void {
  const ref = hoja["!ref"];
  if (!ref) return;

  const range = XLSX.utils.decode_range(ref);
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const addr = XLSX.utils.encode_cell({ r: row, c: COL_PORC_UTILIDAD });
    const cell = hoja[addr];
    if (!cell || cell.t !== "n") continue;
    cell.z = PORC_UTILIDAD_PX_LISTA_EXCEL_NUMFMT;
  }
}

/** Caracteres no válidos en nombres de archivo Windows. */
function sanitizarNombreListaArchivo(nombreLista: string): string {
  return nombreLista
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Un `.xls` por lista con filas; descargas escalonadas para evitar bloqueo del navegador. */
export function descargarExcelsPxListasMargen(
  grupos: ExportPxListaMargenGrupo[]
): number {
  const conFilas = grupos.filter((g) => g.filas.length > 0);
  if (conFilas.length === 0) return 0;

  void import("xlsx").then((XLSX) => {
    const stamp = formatDdMmHhMmResumenAumentosArgentina(new Date());

    conFilas.forEach((grupo, index) => {
      setTimeout(() => {
        const hojaFilas = grupo.filas.map((f) => ({
          CODIGO: f.codigo,
          "PORC UTILIDAD": f.porcUtilidad,
        }));
        const hoja = XLSX.utils.json_to_sheet(hojaFilas);
        aplicarFormatoPorcUtilidadPxLista(hoja, XLSX);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Px Lista");
        hoja["!cols"] = [{ wch: 18 }, { wch: 16 }];
        const nombreLista = sanitizarNombreListaArchivo(grupo.nombreLista);
        const nombre = `Act. ${nombreLista} ${stamp}.xls`;
        XLSX.writeFile(libro, nombre, { bookType: "xls" });
      }, index * INTERVALO_DESCARGAS_MS);
    });
  });

  return conFilas.length;
}
