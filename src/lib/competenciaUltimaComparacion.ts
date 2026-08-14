const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** Días desde `ultimaComparacionAt` (ISO). `null` si nunca se comparó o fecha inválida. */
function diasSinActividadCompetencia(
  iso: string | null | undefined
): number | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / MS_POR_DIA);
}

/** Texto para columna «Días sin Act.» en modales de competencia. */
export function textoDiasSinActividadCompetencia(
  iso: string | null | undefined
): string {
  const dias = diasSinActividadCompetencia(iso);
  if (dias === null) return "—";
  return String(dias);
}
