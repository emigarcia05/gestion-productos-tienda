import { formatDdMmHhMmResumenAumentosArgentina } from "@/lib/fechaArgentina";
import type { ExportPxListaMargenGrupo } from "@/services/exportPxListasMargen.service";

const INTERVALO_DESCARGAS_MS = 350;

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
