import { formatFechaHoraCompletaArgentina } from "@/lib/fechaArgentina";

/** Texto de UI para `ultimaComparacionAt` serializado ISO desde servidor. */
export function labelUltimaComparacionCompetencia(iso: string | null | undefined): string {
  if (!iso) return "Sin comparación previa";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin comparación previa";
  return `Últ. comparación: ${formatFechaHoraCompletaArgentina(d)}`;
}
