import { prisma } from "@/lib/prisma";

export interface FilaExportCostoCx {
  codigo: string;
  costo: number;
}

/** Compara costo DUX (`costo_compra`) vs costo lista (`px_compra_final_sin_iva` del FK). */
export function costosCompraDifieren(costoCompra: number, costoLista: number): boolean {
  const a = Math.round(costoCompra * 100);
  const b = Math.round(costoLista * 100);
  return a !== b;
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Ítems con `cod_ext_costo_lista` donde el costo lista (proveedor) ≠ `costo_compra` (DUX).
 * COSTO exportado = valor de la fila referenciada por `cod_ext_costo_lista`.
 */
export async function listarFilasExportCostoCxDiff(): Promise<FilaExportCostoCx[]> {
  const rows = await prisma.listaPrecioTienda.findMany({
    where: { codExtCostoLista: { not: null } },
    select: {
      codTienda: true,
      costoCompra: true,
      costoListaProveedor: {
        select: { pxCompraFinalSinIva: true },
      },
    },
    orderBy: { codTienda: "asc" },
  });

  const filas: FilaExportCostoCx[] = [];
  for (const r of rows) {
    const lp = r.costoListaProveedor;
    if (!lp) continue;
    const costoDux = toNum(r.costoCompra);
    const costoLista = toNum(lp.pxCompraFinalSinIva);
    if (!costosCompraDifieren(costoDux, costoLista)) continue;
    filas.push({
      codigo: r.codTienda,
      costo: Math.round(costoLista),
    });
  }
  return filas;
}
