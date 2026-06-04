/** Formato de precio lista tienda en celdas (hasta 4 decimales, es-AR). */
export function fmtPxListaTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
