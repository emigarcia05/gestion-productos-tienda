import { calcPxCompraFinal } from "@/lib/calculos";

export type ProductoVinculoTienda = {
  id: string;
  proveedorId: string;
  codigoExterno: string;
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoRubro: number;
  descuentoCantidad: number;
  cxTransporte: number;
  pxCompraFinalSinIva?: number | null;
  proveedor: { nombre: string; prefijo: string };
};

const UMBRAL_PCT = 1;

function pxCompraDeProductoVinculo(p: ProductoVinculoTienda): number {
  return p.pxCompraFinalSinIva != null
    ? p.pxCompraFinalSinIva
    : calcPxCompraFinal(
        p.precioLista,
        p.descuentoRubro,
        p.descuentoCantidad,
        p.cxTransporte
      );
}

export function ordenarFilasVinculosTienda(
  vinculados: ProductoVinculoTienda[],
  prefijoProveedorPrincipal: string
): { producto: ProductoVinculoTienda; px: number }[] {
  const prefijoPrincipal = prefijoProveedorPrincipal.trim().toLowerCase();
  const conPx = vinculados.map((p) => ({
    producto: p,
    px: pxCompraDeProductoVinculo(p),
  }));
  const principalItem =
    prefijoPrincipal === ""
      ? null
      : vinculados.find(
          (p) => p.proveedor.prefijo.trim().toLowerCase() === prefijoPrincipal
        ) ?? null;

  if (principalItem) {
    const principalRow = conPx.find((r) => r.producto.id === principalItem.id);
    const rest = conPx
      .filter((r) => r.producto.id !== principalItem.id)
      .sort((a, b) => a.px - b.px);
    return principalRow ? [principalRow, ...rest] : rest;
  }
  return [...conPx].sort((a, b) => a.px - b.px);
}

export function calcPxBaseVinculosTienda(
  filasOrdenadas: { producto: ProductoVinculoTienda; px: number }[],
  codExtBase: string | null
): number | null {
  if (!codExtBase) return null;
  const baseRow = filasOrdenadas.find((r) => r.producto.codigoExterno === codExtBase);
  return baseRow ? baseRow.px : null;
}

export function labelVariacionVsBase(px: number, pxBase: number | null): {
  kind: "empty" | "neutral" | "up" | "down";
  text: string;
  title?: string;
} {
  if (pxBase == null || pxBase <= 0 || px <= 0) {
    return { kind: "empty", text: "—" };
  }
  const dif = ((px - pxBase) / pxBase) * 100;
  const abs = Math.abs(dif);
  if (abs < UMBRAL_PCT) return { kind: "neutral", text: "≈0%" };
  const absFmt = abs.toFixed(1);
  if (dif > 0) {
    return {
      kind: "up",
      text: `+${absFmt}%`,
      title: `Precio ${absFmt}% más caro que la base seleccionada`,
    };
  }
  return {
    kind: "down",
    text: `-${absFmt}%`,
    title: `Precio ${absFmt}% más económico que la base seleccionada`,
  };
}
