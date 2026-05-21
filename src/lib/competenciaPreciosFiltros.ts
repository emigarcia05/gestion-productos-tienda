/** Valores de filtro del listado Precios Competencia (URL / action / Zod). */

export const DIF_PROMEDIO_FILTRO = {
  MAS_CARO: "MAS_CARO",
  MAS_BARATO: "MAS_BARATO",
} as const;

export type DifPromedioFiltro =
  (typeof DIF_PROMEDIO_FILTRO)[keyof typeof DIF_PROMEDIO_FILTRO];

export const CONFIGURADO_FILTRO = {
  SI: "SI",
  NO: "NO",
} as const;

export type ConfiguradoFiltro =
  (typeof CONFIGURADO_FILTRO)[keyof typeof CONFIGURADO_FILTRO];

export const DIF_PROMEDIO_OPCIONES = [
  { value: DIF_PROMEDIO_FILTRO.MAS_CARO, label: "MAS CARO" },
  { value: DIF_PROMEDIO_FILTRO.MAS_BARATO, label: "MAS BARATO" },
] as const;

export const CONFIGURADO_OPCIONES = [
  { value: CONFIGURADO_FILTRO.SI, label: "SI" },
  { value: CONFIGURADO_FILTRO.NO, label: "NO" },
] as const;
