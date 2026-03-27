export type FilaParedLts = {
  id: string;
  cantidad: string;
  largo: string;
  ancho: string;
};

export function crearFilaParedVacia(): FilaParedLts {
  return {
    id: `pared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cantidad: "",
    largo: "",
    ancho: "",
  };
}

const IDS_FILAS_MODULO = [
  "modulo-pared-1",
  "modulo-pared-2",
  "modulo-pared-3",
  "modulo-pared-4",
  "modulo-techo",
] as const;

/** Cinco filas fijas para POR MÓDULO (ids estables). */
export function crearFilasModuloIniciales(): FilaParedLts[] {
  return IDS_FILAS_MODULO.map((id) => ({
    id,
    cantidad: "",
    largo: "",
    ancho: "",
  }));
}

/** Input decimal con como máximo un dígito tras el separador decimal. */
export function sanitizeDecimalUnDigito(value: string): string {
  const s = value.replace(/[^\d.,]/g, "").replace(",", ".");
  if (!s) return "";
  const parts = s.split(".");
  if (parts.length === 1) return parts[0]!;
  const intPart = parts[0] ?? "";
  const rest = parts.slice(1).join("");
  const frac = rest.replace(/\D/g, "").slice(0, 1);
  if (frac === "" && s.endsWith(".")) return `${intPart}.`;
  return frac === "" ? intPart : `${intPart}.${frac}`;
}

export function parseMonto(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function formatMonto(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function roundToNearestHundred(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 100) * 100;
}

export function parseDecimalInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function formatDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
