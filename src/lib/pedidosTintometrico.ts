/**
 * Clave lógica de ítem tintométrico en `prod_ped_merc.cod_ext`.
 * Debe incluir el código tintométrico además del cod. tienda: varias líneas pueden
 * compartir la misma base (mismo cod_tienda) con distinto COD. de fórmula.
 */
export function normalizarCodigoTintometricoParaExt(cod: string): string {
  const t = cod
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-_/]/g, "_")
    .slice(0, 80);
  return t || "SIN-COD";
}

export function buildCodExtTintometrico(codTienda: string, codTintometrico: string): string {
  const ct = codTienda.trim();
  const slug = normalizarCodigoTintometricoParaExt(codTintometrico);
  return `TINT-${ct}-${slug}`;
}

/**
 * Extrae `cod_tienda` desde `cod_ext` tintométrico (`TINT-{codTienda}-{slug}`).
 * Devuelve `null` si el formato no coincide o el código queda vacío.
 */
export function parseCodTiendaFromCodExtTintometrico(codExt: string): string | null {
  const t = codExt.trim();
  if (!t.toUpperCase().startsWith("TINT-")) return null;
  const rest = t.slice(5);
  const splitIdx = rest.indexOf("-");
  if (splitIdx <= 0) return null;
  const codTienda = rest.slice(0, splitIdx).trim();
  return codTienda.length > 0 ? codTienda : null;
}
