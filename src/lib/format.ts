/** Formatea un número como precio en pesos (sin símbolo, sin decimales). */
export function fmtPrecio(n: number): string {
  return Math.round(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Formatea una variación porcentual con signo y un decimal. */
export function fmtPct(n: number): string {
  const abs = Math.abs(n).toFixed(1);
  if (n > 0.5)  return `+${abs}%`;
  if (n < -0.5) return `-${abs}%`;
  return "≈0%";
}
