/** Valor del Select “sin referencia” en Px Listas · 1 - GENERAL. */
export const PX_LISTAS_COMP_REF_NINGUNO = "-";

export type OpcionCompetenciaRefPxListas = {
  competenciaId: string;
  nombre: string;
  /** Precio de referencia (sugerido o scraping), entero en pesos. */
  px: number;
};
