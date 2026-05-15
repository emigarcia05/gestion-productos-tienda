export type ItemStockControlMeta = { codItem: string; stock: number };

export function formatStockInputValor(stock: number): string {
  return Number.isInteger(stock) ? stock.toFixed(0) : stock.toFixed(2);
}

export function getVariacionStock(
  stockOriginal: number,
  stockEditadoRaw: string | undefined
): { deltaAbs: string; sube: boolean } | null {
  if (stockEditadoRaw === undefined || stockEditadoRaw === "") return null;
  const stockEditado = Number(stockEditadoRaw);
  if (!Number.isFinite(stockEditado)) return null;
  const delta = stockEditado - stockOriginal;
  if (delta === 0) return null;
  return {
    deltaAbs: Math.abs(delta).toLocaleString("es-AR", {
      minimumFractionDigits: Number.isInteger(delta) ? 0 : 2,
      maximumFractionDigits: 2,
    }),
    sube: delta > 0,
  };
}

export type FilaExportStockVariacion = {
  id: string;
  codItem: string;
  cantidad: number;
};

/** Solo ítems con variación (archivo Excel para DUX). */
export function filasConVariacionStockParaExportar(
  stocksEditados: Record<string, string>,
  metaPorId: Record<string, ItemStockControlMeta>
): FilaExportStockVariacion[] {
  const filas: FilaExportStockVariacion[] = [];
  for (const [id, raw] of Object.entries(stocksEditados)) {
    const meta = metaPorId[id];
    if (!meta) continue;
    if (!getVariacionStock(meta.stock, raw)) continue;
    const cantidad = raw !== "" ? Number(raw) : meta.stock;
    if (!Number.isFinite(cantidad)) continue;
    filas.push({ id, codItem: meta.codItem, cantidad });
  }
  return filas;
}

/** Ítems a persistir como controlados al exportar (variación o confirmación en sesión). */
export function idsControlStockParaPersistir(
  stocksEditados: Record<string, string>,
  metaPorId: Record<string, ItemStockControlMeta>,
  confirmadosSesion: Record<string, boolean>
): string[] {
  const ids = new Set<string>();
  for (const [id, raw] of Object.entries(stocksEditados)) {
    const meta = metaPorId[id];
    if (!meta) continue;
    if (getVariacionStock(meta.stock, raw)) ids.add(id);
  }
  for (const [id, ok] of Object.entries(confirmadosSesion)) {
    if (ok) ids.add(id);
  }
  return [...ids];
}

export function itemControladoEnSesion(
  id: string,
  stocksEditados: Record<string, string>,
  meta: ItemStockControlMeta | undefined,
  confirmado: boolean
): boolean {
  if (!meta) return false;
  if (confirmado) return true;
  return !!getVariacionStock(meta.stock, stocksEditados[id]);
}
