/** Códigos persistidos en `fin_ana_mc_formulas`. */
export const FIN_ANA_MC_FORMULA_CODIGOS = [
  "PX_LISTA_C_IVA",
  "IVA_ALICUOTA",
  "IIBB_ALICUOTA",
] as const;

export type FinAnaMcFormulaCodigo = (typeof FIN_ANA_MC_FORMULA_CODIGOS)[number];

export type FinAnaMcFormulaItem = {
  codigo: FinAnaMcFormulaCodigo;
  etiqueta: string;
  valor: number;
  orden: number;
};

/** Defaults alineados a la semilla SQL / simulador histórico. */
export const FIN_ANA_MC_FORMULA_DEFAULTS: Record<
  FinAnaMcFormulaCodigo,
  { etiqueta: string; valor: number; orden: number }
> = {
  PX_LISTA_C_IVA: { etiqueta: "PX LISTA C/ IVA", valor: 100, orden: 10 },
  IVA_ALICUOTA: { etiqueta: "IVA ALÍCUOTA", valor: 0.21, orden: 20 },
  IIBB_ALICUOTA: { etiqueta: "IIBB ALÍCUOTA", valor: 0.04, orden: 30 },
};

/** Parámetros resueltos para el motor de cálculo. */
export type ParametrosFormulaMargenContribucion = {
  pxListaCIva: number;
  ivaAlicuota: number;
  iibbAlicuota: number;
  /** `1 + ivaAlicuota` (p. ej. 1,21). */
  ivaFactor: number;
};

export function esFinAnaMcFormulaCodigo(
  value: string
): value is FinAnaMcFormulaCodigo {
  return (FIN_ANA_MC_FORMULA_CODIGOS as readonly string[]).includes(value);
}

export function resolverParametrosFormulaMargenContribucion(
  items: readonly FinAnaMcFormulaItem[]
): ParametrosFormulaMargenContribucion {
  const byCodigo = new Map(items.map((item) => [item.codigo, item.valor]));

  const pxListaCIva =
    byCodigo.get("PX_LISTA_C_IVA") ??
    FIN_ANA_MC_FORMULA_DEFAULTS.PX_LISTA_C_IVA.valor;
  const ivaAlicuota =
    byCodigo.get("IVA_ALICUOTA") ??
    FIN_ANA_MC_FORMULA_DEFAULTS.IVA_ALICUOTA.valor;
  const iibbAlicuota =
    byCodigo.get("IIBB_ALICUOTA") ??
    FIN_ANA_MC_FORMULA_DEFAULTS.IIBB_ALICUOTA.valor;

  const ivaFactor = 1 + ivaAlicuota;

  return {
    pxListaCIva: pxListaCIva > 0 ? pxListaCIva : FIN_ANA_MC_FORMULA_DEFAULTS.PX_LISTA_C_IVA.valor,
    ivaAlicuota: ivaAlicuota > 0 ? ivaAlicuota : FIN_ANA_MC_FORMULA_DEFAULTS.IVA_ALICUOTA.valor,
    iibbAlicuota: iibbAlicuota >= 0 ? iibbAlicuota : FIN_ANA_MC_FORMULA_DEFAULTS.IIBB_ALICUOTA.valor,
    ivaFactor: ivaFactor > 1 ? ivaFactor : 1 + FIN_ANA_MC_FORMULA_DEFAULTS.IVA_ALICUOTA.valor,
  };
}
