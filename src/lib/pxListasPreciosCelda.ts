import {
  calcMargenSinIvaPct,
  calcPxListaDesdeMargenSinIvaPct,
} from "@/lib/calculos";
import {
  margenesPorcUtilidadDifieren,
  preciosPxListaSincronizados,
  roundMargenPxListaPct,
} from "@/lib/pxListasPreciosFormat";
import type { PrecioListaPxListasCelda } from "@/lib/pxListasPrecios";

export function margenDesdePrecioDux(
  pxDux: number | null,
  costoCompra: number
): number | null {
  if (pxDux == null || !(pxDux > 0) || !(costoCompra > 0)) return null;
  const margen = calcMargenSinIvaPct(pxDux, costoCompra);
  return margen == null ? null : roundMargenPxListaPct(margen);
}

/**
 * Pendiente de subir a DUX si hay margen manual y el precio DUX (entero) no coincide
 * con el PX calculado desde ese margen. La API no trae margen; comparar solo márgenes
 * inversos genera falsos positivos por redondeo.
 */
export function celdaRequiereActualizar(celda: PrecioListaPxListasCelda): boolean {
  if (celda.margenManual == null) return false;
  if (celda.pxDux == null) return true;
  if (preciosPxListaSincronizados(celda.pxDux, celda.pxEfectivo)) return false;
  if (celda.pxEfectivo != null) return true;
  if (celda.margenDux == null) return true;
  return margenesPorcUtilidadDifieren(celda.margenManual, celda.margenDux);
}

export function armarCeldaPrecioPxListas(params: {
  idLista: number;
  costoCompra: number;
  pxDux: number | null;
  margenManual: number | null;
}): PrecioListaPxListasCelda {
  const { idLista, costoCompra, pxDux, margenManual } = params;
  const margenDux = margenDesdePrecioDux(pxDux, costoCompra);

  let margenPct: number | null;
  let pxEfectivo: number | null;

  if (margenManual != null) {
    margenPct = roundMargenPxListaPct(margenManual);
    pxEfectivo = calcPxListaDesdeMargenSinIvaPct(margenPct, costoCompra);
  } else {
    margenPct = margenDux;
    pxEfectivo = pxDux;
  }

  const celda: PrecioListaPxListasCelda = {
    idLista,
    pxDux,
    margenManual,
    margenDux,
    pxEfectivo,
    margenPct,
    requiereActualizar: false,
  };

  return {
    ...celda,
    requiereActualizar: celdaRequiereActualizar(celda),
  };
}

export function itemRequiereActualizar(
  preciosPorLista: PrecioListaPxListasCelda[]
): boolean {
  return preciosPorLista.some((c) => c.requiereActualizar);
}

export function filtrarItemPorActualizar(
  item: { preciosPorLista: PrecioListaPxListasCelda[] },
  filtro: "si" | "no"
): boolean {
  const tieneManual = item.preciosPorLista.some((c) => c.margenManual != null);
  if (!tieneManual) return false;

  const algunaRequiere = itemRequiereActualizar(item.preciosPorLista);
  return filtro === "si" ? algunaRequiere : !algunaRequiere;
}
