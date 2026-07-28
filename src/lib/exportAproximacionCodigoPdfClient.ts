import { formatDdMmHhMmGuionesBajosArchivoArgentina } from "@/lib/fechaArgentina";
import { descargarPdfBytes } from "@/lib/descargarPdfBase64";
import type { InformeAproximacionCodigoImagen } from "@/lib/generarPdfAproximacionCodigoImagen";

/** Compone imagen anotada, genera PDF y lo descarga en el navegador. */
export async function descargarPdfAproximacionCodigoImagen(
  informe: InformeAproximacionCodigoImagen,
): Promise<void> {
  const {
    componerImagenConMuestra,
    generarPdfAproximacionCodigoImagen,
  } = await import("@/lib/generarPdfAproximacionCodigoImagen");

  const anotada = await componerImagenConMuestra(
    informe.imagenDataUrl,
    informe.imagenNaturalW,
    informe.imagenNaturalH,
    informe.muestra,
  );
  const bytes = generarPdfAproximacionCodigoImagen(informe, anotada);
  const stamp = formatDdMmHhMmGuionesBajosArchivoArgentina(new Date());
  descargarPdfBytes(bytes, `Aproximacion Codigo Imagen - ${stamp}.pdf`);
}
