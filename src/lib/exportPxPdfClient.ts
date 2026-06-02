import type { InformeAumentosPxExport } from "@/lib/exportPxDiffTypes";
import { formatDdMmHhMmResumenAumentosArgentina } from "@/lib/fechaArgentina";
import { descargarPdfBytes } from "@/lib/descargarPdfBase64";

/** Genera y descarga el PDF (Resumen + Detalle) en el navegador. */
export async function descargarPdfResumenAumentosPx(
  informe: InformeAumentosPxExport
): Promise<void> {
  const { generarPdfAumentosPx } = await import("@/lib/generarPdfAumentosPx");
  const generadoAt = new Date();
  const bytes = generarPdfAumentosPx(informe, { fechaDocumento: generadoAt });
  const filename = `Resumen Aumentos ${formatDdMmHhMmResumenAumentosArgentina(generadoAt)}.pdf`;
  descargarPdfBytes(bytes, filename);
}
