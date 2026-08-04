/**
 * Extrae litros desde la descripción del producto (p. ej. «… 20 LTS», «4 L»).
 * Si hay varios matches, usa el último (suele ser el volumen al final).
 */
export function extraerLitrosDesdeDescripcion(
  descripcion: string | null | undefined
): number | null {
  const s = (descripcion ?? "").toLocaleUpperCase("es-AR");
  if (!s.trim()) return null;

  const re = /(\d+(?:[.,]\d+)?)\s*LTS?\b/gi;
  let last: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    const raw = match[1]?.replace(",", ".") ?? "";
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      last = n;
    }
  }
  return last;
}

/** Etiqueta de litros para UI / filtros (sin unidad). */
export function etiquetaLitros(lts: number | null): string {
  if (lts == null) return "";
  return Number.isInteger(lts)
    ? String(lts)
    : lts.toLocaleString("es-AR", { maximumFractionDigits: 3 });
}
