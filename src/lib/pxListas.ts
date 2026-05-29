/** Valor del select DET PRECIO cuando el precio es manual. */
export const DET_PRECIO_MANUAL = "manual" as const;

/** Px. lista desde `prod_precios_provee.px_vta_sugerido` del vínculo habilitado al `cod_tienda`. */
export const DET_PRECIO_SUGERIDO = "sugerido" as const;

export type DetPrecioSeleccion =
  | typeof DET_PRECIO_MANUAL
  | typeof DET_PRECIO_SUGERIDO
  | string;

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
  /** `px_vta_sugerido` del proveedor vinculado (lectura; ver `buildMapPxVtaSugeridoPorCodTienda`). */
  pxPrecioSugerido: number | null;
  pxLista: number | null;
  pxListaManual: number | null;
  marcacion: number | null;
  esDetPrecioManual: boolean;
  esDetPrecioSugerido: boolean;
};

/** Decimales visibles de la columna MARCACION en Px Listas. */
export const PX_LISTAS_MARCACION_DECIMALES = 5;

export function roundMarcacionPxLista(value: number): number {
  const factor = 10 ** PX_LISTAS_MARCACION_DECIMALES;
  return Math.round(value * factor) / factor;
}

/** Marcación Px Listas: (PX LISTA / costo_compra) / 1,21 — cinco decimales. */
export function calcMarcacionPxLista(pxLista: number, costoCompra: number): number | null {
  if (!(pxLista > 0) || !(costoCompra > 0)) return null;
  if (!Number.isFinite(pxLista) || !Number.isFinite(costoCompra)) return null;
  const valor = pxLista / costoCompra / 1.21;
  return roundMarcacionPxLista(valor);
}

export function fmtMarcacionPxLista(pxLista: number | null, costoCompra: number): string {
  if (pxLista == null) return "—";
  const m = calcMarcacionPxLista(pxLista, costoCompra);
  if (m == null) return "—";
  return m.toLocaleString("es-AR", {
    minimumFractionDigits: PX_LISTAS_MARCACION_DECIMALES,
    maximumFractionDigits: PX_LISTAS_MARCACION_DECIMALES,
  });
}
