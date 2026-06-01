const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** Días desde `ultimaComparacionAt` (ISO). `null` si nunca se comparó o fecha inválida. */
export function getDiasSinActividadCompetencia(
  ultimaComparacionAtIso: string | null | undefined
): number | null {
  if (!ultimaComparacionAtIso?.trim()) return null;
  const timestamp = Date.parse(ultimaComparacionAtIso);
  if (Number.isNaN(timestamp)) return null;
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / MS_POR_DIA);
}

export function labelDiasSinActividadCompetencia(dias: number | null): string {
  if (dias === null) return "—";
  if (dias === 0) return "0";
  return String(dias);
}
