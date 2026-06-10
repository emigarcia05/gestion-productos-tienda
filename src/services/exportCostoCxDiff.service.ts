import { prisma } from "@/lib/prisma";

export interface FilaExportCostoCx {
  codigo: string;
  costo: number;
}

/** Precisión de `costo_compra` y `px_compra_final_sin_iva` (4 decimales). */
const COMPARACION_COSTO_FACTOR = 10_000;

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Difieren `prod_tienda.costo_compra` vs `prod_precios_provee.px_compra_final_sin_iva`
 * (vinculados por `costo_compra_cod_ext` → `cod_ext`).
 */
export function costosCompraDifieren(costoCompra: number, pxProveedorSinIva: number): boolean {
  return (
    Math.round(costoCompra * COMPARACION_COSTO_FACTOR) !==
    Math.round(pxProveedorSinIva * COMPARACION_COSTO_FACTOR)
  );
}

/**
 * Ítems a exportar: tienen `costo_compra_cod_ext` y el costo DUX
 * (`costo_compra`) difiere de `px_compra_final_sin_iva` del proveedor vinculado.
 * CODIGO = `cod_tienda`, COSTO = `px_compra_final_sin_iva` redondeado a 2 decimales.
 */
export async function listarFilasExportCostoCxDiff(): Promise<FilaExportCostoCx[]> {
  const rows = await prisma.prodTienda.findMany({
    where: {
      costoCompraCodExt: { not: null },
    },
    select: {
      codTienda: true,
      costoCompra: true,
      costoListaProveedor: {
        select: {
          pxCompraFinalSinIva: true,
          habilitado: true,
        },
      },
    },
    orderBy: { codTienda: "asc" },
  });

  const filas: FilaExportCostoCx[] = [];
  for (const row of rows) {
    const proveedor = row.costoListaProveedor;
    if (!proveedor?.habilitado) continue;

    const pxFinal = toNum(proveedor.pxCompraFinalSinIva);
    if (pxFinal <= 0) continue;

    const costoDux = toNum(row.costoCompra);
    if (!costosCompraDifieren(costoDux, pxFinal)) continue;

    filas.push({
      codigo: row.codTienda,
      costo: Math.round(pxFinal * 100) / 100,
    });
  }
  return filas;
}
