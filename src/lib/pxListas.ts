/** Valor del select DET PRECIO cuando el precio es manual. */
export const DET_PRECIO_MANUAL = "manual" as const;

export type DetPrecioSeleccion = typeof DET_PRECIO_MANUAL | string;

export type OpcionCompetenciaPxLista = {
  competenciaId: string;
  nombre: string;
  px: number | null;
};

export type ItemPxListasParaTabla = {
  id: string;
  codItem: string;
  descripcion: string;
  costoCompra: number;
  detPrecioSeleccion: DetPrecioSeleccion;
  opcionesCompetencia: OpcionCompetenciaPxLista[];
  pxLista: number | null;
  pxListaManual: number | null;
  marcacion: number | null;
  esDetPrecioManual: boolean;
};

/** Marcación Px Listas: (PX LISTA / costo_compra) / 1,21 — dos decimales. */
export function calcMarcacionPxLista(pxLista: number, costoCompra: number): number | null {
  if (!(pxLista > 0) || !(costoCompra > 0)) return null;
  if (!Number.isFinite(pxLista) || !Number.isFinite(costoCompra)) return null;
  const valor = pxLista / costoCompra / 1.21;
  return Math.round(valor * 100) / 100;
}

export function fmtMarcacionPxLista(pxLista: number | null, costoCompra: number): string {
  if (pxLista == null) return "—";
  const m = calcMarcacionPxLista(pxLista, costoCompra);
  if (m == null) return "—";
  return m.toFixed(2);
}
