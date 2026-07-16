/** Registro de paleta Colores Marca (`mkt_colores_marca`). */
export type MktColorMarcaItem = {
  id: string;
  nombre: string;
  descripcion: string;
  /** Códigos normalizados (#RRGGBB), separados por coma en persistencia. */
  codHexadecimales: string[];
};

const HEX_TOKEN = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;

/** Normaliza un token hex a #RRGGBB en mayúsculas. */
export function normalizeHexToken(raw: string): string | null {
  let token = raw.trim();
  if (!token) return null;
  if (!token.startsWith("#")) token = `#${token}`;
  if (!HEX_TOKEN.test(token)) return null;
  const hex = token.slice(1).toUpperCase();
  if (hex.length === 3) {
    const expanded = hex
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${expanded}`;
  }
  return `#${hex}`;
}

/** Parsea texto libre (coma, espacio o salto de línea) a códigos hex válidos. */
export function parseCodHexadecimalesInput(raw: string): string[] {
  const tokens = raw.split(/[,;\s\n]+/).map((t) => t.trim()).filter(Boolean);
  const out: string[] = [];
  for (const token of tokens) {
    const norm = normalizeHexToken(token);
    if (norm && !out.includes(norm)) out.push(norm);
  }
  return out;
}

/** Serializa códigos para columna `cod_hexadecimales`. */
export function serializeCodHexadecimales(codes: string[]): string {
  return codes.join(",");
}

/** Texto editable del input (sin `#`; el prefijo visual lo aporta la máscara). */
export function formatCodHexadecimalesForInput(codes: string[]): string {
  return codes.map((c) => c.replace(/^#/, "")).join(", ");
}

/** Sanitiza texto del input: hex y separadores coma/espacio (sin `#`). */
export function sanitizeHexDigitsInput(raw: string): string {
  return raw.replace(/[^0-9A-Fa-f,\s]/g, "").toUpperCase();
}

/** Parsea valor persistido a array de códigos. */
export function parseCodHexadecimalesStored(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((t) => normalizeHexToken(t))
    .filter((t): t is string => Boolean(t));
}
