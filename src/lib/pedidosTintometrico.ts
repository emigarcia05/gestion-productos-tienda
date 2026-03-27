/**
 * Clave lógica de ítem tintométrico en `pedidos_mercaderia.cod_ext`.
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
