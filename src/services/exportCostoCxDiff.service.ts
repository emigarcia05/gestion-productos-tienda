import { prisma } from "@/lib/prisma";

export interface FilaExportCostoCx {
  codigo: string;
  costo: number;
}

/** Ítem con diff de costo (Excel + informe PDF). */
export type ItemCostoCxDiff = {
  codTienda: string;
  descripcion: string;
  marca: string;
  rubro: string;
  costoViejo: number;
  costoNuevo: number;
};

export const MARCA_COSTO_CX_SIN_INFORMAR = "SIN MARCA";
export const RUBRO_COSTO_CX_SIN_INFORMAR = "SIN RUBRO";

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

export function redondearCostoCxExport(px: number): number {
  return Math.round(px * 100) / 100;
}

/**
 * SSOT ítems Act. Cx.: `costo_compra_cod_ext`, vínculo habilitado, diff a 4 decimales,
 * `px_compra_final_sin_iva` > 0. Usado por Excel y PDF de aumentos.
 */
export async function listarItemsCostoCxDiff(): Promise<ItemCostoCxDiff[]> {
  const rows = await prisma.prodTienda.findMany({
    where: {
      costoCompraCodExt: { not: null },
    },
    select: {
      codTienda: true,
      descripcionTienda: true,
      marca: true,
      rubro: true,
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

  const items: ItemCostoCxDiff[] = [];
  for (const row of rows) {
    const proveedor = row.costoListaProveedor;
    if (!proveedor?.habilitado) continue;

    const pxFinal = toNum(proveedor.pxCompraFinalSinIva);
    if (pxFinal <= 0) continue;

    const costoViejo = toNum(row.costoCompra);
    if (!costosCompraDifieren(costoViejo, pxFinal)) continue;

    const marca = row.marca?.trim() || MARCA_COSTO_CX_SIN_INFORMAR;
    const rubro = row.rubro?.trim() || RUBRO_COSTO_CX_SIN_INFORMAR;
    const descripcion = (row.descripcionTienda?.trim() || "Sin descripción").slice(0, 256);

    items.push({
      codTienda: row.codTienda,
      descripcion,
      marca,
      rubro,
      costoViejo,
      costoNuevo: redondearCostoCxExport(pxFinal),
    });
  }
  return items;
}

/**
 * Ítems a exportar en Excel: CODIGO = `cod_tienda`, COSTO = `px_compra_final_sin_iva` (2 dec.).
 */
export async function listarFilasExportCostoCxDiff(): Promise<FilaExportCostoCx[]> {
  const items = await listarItemsCostoCxDiff();
  return items.map((item) => ({
    codigo: item.codTienda,
    costo: item.costoNuevo,
  }));
}
