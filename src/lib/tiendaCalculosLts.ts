export type FilaParedLts = {
  id: string;
  cantParedes: string;
  largoPared: string;
  anchoPared: string;
};

export function crearFilaParedVacia(): FilaParedLts {
  return {
    id: `pared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cantParedes: "",
    largoPared: "",
    anchoPared: "",
  };
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
