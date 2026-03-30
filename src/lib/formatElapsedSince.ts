/** Etiqueta relativa tipo sidebar (bloques de 15 min. si es menor a 1 h; luego horas/días). */
export function formatLastCompletedAtElapsed(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const nowMs = Date.now();
  const diffMs = Math.max(0, nowMs - date.getTime());

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) {
    if (minutes < 15) return "Hace menos de 15 min.";
    const roundedTo15 = Math.floor(minutes / 15) * 15;
    return `Hace ${roundedTo15} min.`;
  }

  const hoursTotal = Math.floor(minutes / 60);
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;

  if (days > 0) {
    const dayLabel = days === 1 ? "día" : "días";
    if (hours > 0) {
      const hourLabel = hours === 1 ? "hora" : "horas";
      return `Hace ${days} ${dayLabel} y ${hours} ${hourLabel}`;
    }
    return `Hace ${days} ${dayLabel}`;
  }

  const hourLabel = hoursTotal === 1 ? "hora" : "horas";
  return `Hace ${hoursTotal} ${hourLabel}`;
}
