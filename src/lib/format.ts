/** Opciones estándar: 0 decimales, punto como separador de miles (ej. 1.500). */
const OPCIONES_ENTERO = { minimumFractionDigits: 0, maximumFractionDigits: 0 } as const;

/** Formatea un número como precio en pesos (sin símbolo, 0 decimales, punto para miles). */
export function fmtPrecio(n: number): string {
  return Math.round(n).toLocaleString("es-AR", OPCIONES_ENTERO);
}

/** Formatea un valor numérico para tabla: 0 decimales, punto miles. Vacío/null → "—". */
export function fmtNumero(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("es-AR", OPCIONES_ENTERO);
}

/** Valor para celda: si está vacío o es nulo, devuelve "—" (guion medio); si no, String(val). */
export function fmtCelda<T>(val: T | null | undefined): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string" && val.trim() === "") return "—";
  return String(val);
}

/** Formatea una variación porcentual con signo y un decimal. */
export function fmtPct(n: number): string {
  const abs = Math.abs(n).toFixed(1);
  if (n > 0.5)  return `+${abs}%`;
  if (n < -0.5) return `-${abs}%`;
  return "≈0%";
}

/** Variación porcentual sin decimales (entero). Para Control Aumentos y listados que muestran % redondeado. */
export function fmtPctEntero(n: number): string {
  const entero = Math.round(n);
  if (entero > 0)  return `+${entero}%`;
  if (entero < 0) return `${entero}%`;
  return "0%";
}
