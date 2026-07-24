import type { TipoComprobanteVentaMargenContribucion } from "@/lib/finAnaMargenContribucion";
import type { MetricaGraficoMcMargenContribucion } from "@/lib/finAnaMargenContribucion";

/** PK fija del singleton `fin_ana_mc_cat_config`. */
export const FIN_ANA_MC_CONFIG_ID = "DEFAULT" as const;

/** Escala de umbrales de Cat. M.C. y default de métrica del gráfico. */
export const FIN_ANA_MC_VARIABLES_OBJETIVO = ["MC", "MC_PONDERADO"] as const;

export type VariableObjetivoMargenContribucion =
  (typeof FIN_ANA_MC_VARIABLES_OBJETIVO)[number];

export const ETIQUETA_VARIABLE_OBJETIVO_MC: Record<
  VariableObjetivoMargenContribucion,
  string
> = {
  MC: "M.C",
  MC_PONDERADO: "M.C. PONDERADO",
};

export type FinAnaMcConfigItem = {
  id: string;
  /** `null` = promedio de terminales (sin filtro). */
  terminalId: string | null;
  tipoComprobante: TipoComprobanteVentaMargenContribucion;
  variableObjetivo: VariableObjetivoMargenContribucion;
  updatedAt: string;
};

export const FIN_ANA_MC_CONFIG_DEFAULT: Omit<FinAnaMcConfigItem, "updatedAt"> = {
  id: FIN_ANA_MC_CONFIG_ID,
  terminalId: null,
  tipoComprobante: "FACTURA_A",
  variableObjetivo: "MC_PONDERADO",
};

export function esVariableObjetivoMargenContribucion(
  value: string
): value is VariableObjetivoMargenContribucion {
  return (FIN_ANA_MC_VARIABLES_OBJETIVO as readonly string[]).includes(value);
}

/** Métrica de gráfico alineada a la variable objetivo de categorías. */
export function metricaDesdeVariableObjetivo(
  variable: VariableObjetivoMargenContribucion
): Extract<MetricaGraficoMcMargenContribucion, "MC" | "MC_PONDERADO"> {
  return variable;
}
