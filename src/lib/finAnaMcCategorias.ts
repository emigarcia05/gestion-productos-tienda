/** Categoría de M.C. por rango % (tabla `fin_ana_mc_categorias`). */
export type FinAnaMcCategoriaItem = {
  id: string;
  categoria: string;
  /** Límite inferior inclusivo (0…99). */
  desdePct: number;
  /** Límite superior exclusivo salvo la última (hasta 100 inclusivo). */
  hastaPct: number;
  orden: number;
};

export const FIN_ANA_MC_CATEGORIA_PCT_MIN = 0;
export const FIN_ANA_MC_CATEGORIA_PCT_MAX = 100;

export type RangoMcCategoriaInput = {
  id?: string;
  categoria?: string;
  desdePct: number;
  hastaPct: number;
};

/**
 * Valida rangos continuos sin huecos ni solapes.
 * Ordenados por `desdePct`: cada `desde` debe ser igual al `hasta` anterior.
 * Si hay filas: la primera empieza en 0 y la última termina en 100.
 */
export function validarContinuidadRangosMcCategorias(
  rangos: RangoMcCategoriaInput[]
): string | null {
  if (rangos.length === 0) return null;

  for (const rango of rangos) {
    if (
      !Number.isInteger(rango.desdePct) ||
      !Number.isInteger(rango.hastaPct)
    ) {
      return "Los límites del rango deben ser enteros.";
    }
    if (
      rango.desdePct < FIN_ANA_MC_CATEGORIA_PCT_MIN ||
      rango.hastaPct > FIN_ANA_MC_CATEGORIA_PCT_MAX
    ) {
      return "Los rangos deben estar entre 0 y 100.";
    }
    if (rango.desdePct >= rango.hastaPct) {
      return "El límite inferior debe ser menor que el superior.";
    }
  }

  const sorted = [...rangos].sort((a, b) => a.desdePct - b.desdePct);

  if (sorted[0]!.desdePct !== FIN_ANA_MC_CATEGORIA_PCT_MIN) {
    return "La primera categoría debe comenzar en 0.";
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr.desdePct < prev.hastaPct) {
      return `El rango se solapa con el que termina en ${prev.hastaPct}. El inferior debe ser ${prev.hastaPct} (no ${curr.desdePct}).`;
    }
    if (curr.desdePct > prev.hastaPct) {
      return `Hay un hueco entre ${prev.hastaPct} y ${curr.desdePct}. El inferior debe ser ${prev.hastaPct} para mantener continuidad.`;
    }
  }

  const last = sorted[sorted.length - 1]!;
  if (last.hastaPct !== FIN_ANA_MC_CATEGORIA_PCT_MAX) {
    return "La última categoría debe terminar en 100.";
  }

  return null;
}

/**
 * Resuelve la categoría para un M.C. %.
 * Regla: `[desde, hasta)` y la última (`hasta === 100`) incluye 100.
 */
export function resolverCategoriaMcPorPct(
  mcPct: number,
  categorias: FinAnaMcCategoriaItem[]
): FinAnaMcCategoriaItem | null {
  if (!Number.isFinite(mcPct) || categorias.length === 0) return null;
  const sorted = [...categorias].sort((a, b) => a.desdePct - b.desdePct);
  for (let i = 0; i < sorted.length; i++) {
    const cat = sorted[i]!;
    const esUltima = i === sorted.length - 1;
    const dentro =
      mcPct >= cat.desdePct &&
      (esUltima ? mcPct <= cat.hastaPct : mcPct < cat.hastaPct);
    if (dentro) return cat;
  }
  return null;
}

export function normalizarNombreCategoriaMc(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}
