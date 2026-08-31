/** Recorte de selección múltiple: vacío = sin filtro (todas las opciones). */

export function pruneSelected(
  selected: readonly string[],
  valid: readonly string[]
): string[] {
  const set = new Set(valid);
  const next = selected.filter((v) => set.has(v));
  if (
    next.length === selected.length &&
    next.every((v, i) => v === selected[i])
  ) {
    return selected as string[];
  }
  return next;
}

/** OR dentro de la dimensión. Array vacío = no filtra. */
export function cumpleFiltroIn(
  selected: readonly string[],
  valor: string
): boolean {
  return selected.length === 0 || selected.includes(valor);
}

/**
 * OR de valores del ítem, más un sentinel de “sin dato”
 * (SIN COLOR / SIN TERMINACION / SIN PRESENTACION).
 */
export function cumpleFiltroListaOSentinel(
  selected: readonly string[],
  valoresItem: readonly string[],
  sentinelVacio: string
): boolean {
  if (selected.length === 0) return true;
  const vacio = valoresItem.length === 0;
  if (selected.includes(sentinelVacio) && vacio) return true;
  return valoresItem.some((v) => selected.includes(v));
}
