import { calcMargenSinIvaPct } from "@/lib/calculos";

/** Decimales visibles de marcación en Px Listas (UI; sin tabla de persistencia dedicada). */
export const PX_LISTAS_MARCACION_DECIMALES = 5;

export function roundMarcacionPxLista(value: number): number {
  const factor = 10 ** PX_LISTAS_MARCACION_DECIMALES;
  return Math.round(value * factor) / factor;
}

/** % utilidad sin IVA desde px lista y costo (`((px/costo)/1,21 − 1)×100`). */
export function calcMarcacionPxListaDesdePx(
  pxLista: number,
  costoCompra: number
): number | null {
  const m = calcMargenSinIvaPct(pxLista, costoCompra);
  if (m == null) return null;
  return roundMarcacionPxLista(m);
}
