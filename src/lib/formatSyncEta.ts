/**
 * Textos de ETA para sincronizaciones DUX en sidebar (`SyncStatusIndicator`).
 * Aproximado: no pretende precisión al segundo.
 */

export function formatSyncEtaMinutes(remainingMinutes: number): string {
  const m = Math.max(1, Math.ceil(remainingMinutes));
  return m === 1 ? "~1 min" : `~${m} min`;
}

/** Línea 2 del botón: progreso numérico + tiempo restante estimado. */
export function formatSyncProgresoConEta(
  procesados: number,
  total: number,
  remainingMinutes: number | null | undefined
): string {
  const prog =
    total > 0
      ? `${procesados.toLocaleString("es-AR")} de ${total.toLocaleString("es-AR")}`
      : "…";

  if (remainingMinutes == null || remainingMinutes <= 0) {
    return prog;
  }

  return `${prog} · ${formatSyncEtaMinutes(remainingMinutes)} restantes`;
}
