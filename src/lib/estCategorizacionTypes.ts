/** Fila de Categorización (`prod_tienda` + color/terminación/lts calculados). */
export type EstCategorizacionItem = {
  codTienda: string;
  descripcionTienda: string;
  marca: string;
  rubro: string;
  subRubro: string;
  /** Nombres de color detectados (MAYÚSCULAS). */
  colores: string[];
  /** Texto para columna COLOR (` · ` si hay varios). */
  colorEtiqueta: string;
  /** Terminaciones detectadas (MAYÚSCULAS). */
  terminaciones: string[];
  /** Texto para columna TERMINACION (` · ` si hay varias). */
  terminacionEtiqueta: string;
  /** Litros detectados en la descripción; `null` si no hay. */
  lts: number | null;
};
