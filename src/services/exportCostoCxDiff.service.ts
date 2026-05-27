import { CX_PROD_SELECCION_PROM, costoCxProdMostrado } from "@/lib/cxPxTienda";
import { prisma } from "@/lib/prisma";
import {
  buildItemsCxPxDesdeFilas,
  filaCxPxSelect,
  listarCompetenciasPxListaCtx,
} from "@/services/cxPxTiendaRows.service";

export interface FilaExportCostoCx {
  codigo: string;
  costo: number;
}

/** Compara `prod_precios_tienda.costo_compra` vs costo CX PROD. (centavos). */
export function costosCompraDifieren(costoCompra: number, costoCxProd: number): boolean {
  const a = Math.round(costoCompra * 100);
  const b = Math.round(costoCxProd * 100);
  return a !== b;
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Control de costos: compara `costo_compra` (DUX) con el valor mostrado en **CX PROD.** de la grilla
 * (`costoCxProdMostrado`: proveedor elegido → `px_compra_final_sin_iva`; **CX. PROM.** → promedio vínculos).
 * Excel: CODIGO = `cod_tienda`, COSTO = ese costo CX PROD. (entero redondeado).
 */
export async function listarFilasExportCostoCxDiff(): Promise<FilaExportCostoCx[]> {
  const competenciasPxLista = await listarCompetenciasPxListaCtx();

  const rows = await prisma.listaPrecioTienda.findMany({
    where: {
      listaPreciosProveedores: {
        some: { habilitado: true },
      },
    },
    select: {
      ...filaCxPxSelect,
      costoCompra: true,
    },
    orderBy: { codTienda: "asc" },
  });

  const costoCompraPorCodTienda = new Map(
    rows.map((r) => [r.codTienda, toNum(r.costoCompra)])
  );

  const items = await buildItemsCxPxDesdeFilas(rows, competenciasPxLista);

  const filas: FilaExportCostoCx[] = [];
  for (const item of items) {
    if (item.opcionesProveedor.length === 0) continue;

    if (item.seleccion === CX_PROD_SELECCION_PROM) {
      if (item.costoPromedio == null || item.costoPromedio <= 0) continue;
    } else {
      const op = item.opcionesProveedor.find((o) => o.codExt === item.seleccion);
      if (!op || op.costo <= 0) continue;
    }

    const costoCxProd = costoCxProdMostrado(item);
    const costoDux = costoCompraPorCodTienda.get(item.codTienda) ?? 0;
    if (!costosCompraDifieren(costoDux, costoCxProd)) continue;

    filas.push({
      codigo: item.codTienda,
      costo: Math.round(costoCxProd),
    });
  }
  return filas;
}
