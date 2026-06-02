import type { ResumenAumentosPromedioPxExport } from "@/lib/exportPxDiffTypes";
import { formatDdMmHhMmResumenAumentosArgentina } from "@/lib/fechaArgentina";
import { descargarPdfBytes } from "@/lib/descargarPdfBase64";

/** Genera y descarga el PDF de resumen en el navegador (evita jsPDF/Buffer en Vercel). */
export async function descargarPdfResumenAumentosPx(
  resumen: ResumenAumentosPromedioPxExport
): Promise<void> {
  const { generarPdfAumentosPx } = await import("@/lib/generarPdfAumentosPx");
  const generadoAt = new Date();
  const bytes = generarPdfAumentosPx(resumen, { fechaDocumento: generadoAt });
  const filename = `Resumen Aumentos ${formatDdMmHhMmResumenAumentosArgentina(generadoAt)}.pdf`;
  descargarPdfBytes(bytes, filename);
}
