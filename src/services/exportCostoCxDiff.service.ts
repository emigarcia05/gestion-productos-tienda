import { CX_PROD_SELECCION_PROM, costoCxProdMostrado } from "@/lib/cxPxTienda";
import { prisma } from "@/lib/prisma";
import { buildCxProdMapDesdeFilas } from "@/services/cxPxTiendaRows.service";

export interface FilaExportCostoCx {
  codigo: string;
  costo: number;
}

/** Compara `costo_compra` (DUX) vs costo CX PROD. en pesos enteros (sin decimales). */
export function costosCompraDifieren(costoCompra: number, costoCxProd: number): boolean {
  return Math.round(costoCompra) !== Math.round(costoCxProd);
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Control de costos: compara `costo_compra` (DUX) con el valor mostrado en **CX PROD.**
 * Excel: CODIGO = `cod_tienda`, COSTO = ese costo CX PROD. (entero redondeado).
 */
export async function listarFilasExportCostoCxDiff(): Promise<FilaExportCostoCx[]> {
  const rows = await prisma.listaPrecioTienda.findMany({
    where: {
      listaPreciosProveedores: {
        some: { habilitado: true },
      },
    },
    select: {
      codTienda: true,
      costoCompra: true,
      costoCompraCodExt: true,
    },
    orderBy: { codTienda: "asc" },
  });

  const cxProdMap = await buildCxProdMapDesdeFilas(
    rows.map((r) => ({
      codTienda: r.codTienda,
      costoCompra: r.costoCompra,
      costoCompraCodExt: r.costoCompraCodExt,
    }))
  );

  const filas: FilaExportCostoCx[] = [];
  for (const row of rows) {
    const item = cxProdMap.get(row.codTienda);
    if (!item || item.opcionesProveedor.length === 0) continue;

    if (item.seleccion === CX_PROD_SELECCION_PROM) {
      if (item.costoPromedio == null || item.costoPromedio <= 0) continue;
    } else {
      const op = item.opcionesProveedor.find((o) => o.codExt === item.seleccion);
      if (!op || op.costo <= 0) continue;
    }

    const costoCxProd = costoCxProdMostrado(item);
    const costoDux = toNum(row.costoCompra);
    if (!costosCompraDifieren(costoDux, costoCxProd)) continue;

    filas.push({
      codigo: row.codTienda,
      costo: Math.round(costoCxProd),
    });
  }
  return filas;
}
