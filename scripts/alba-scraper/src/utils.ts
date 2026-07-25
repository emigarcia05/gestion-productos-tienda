/**
 * Utilidades de parseo / URLs / códigos Alba.
 */
import { ALBA_CONFIG } from "./config";

const LABEL_RE =
  /^(?<nombre>.+?)\s*[-–]\s*(?<codigo>\d{2}[A-Z]{2}\s+\d{2}\/\d{3})\s*$/u;

/** Parsea "Nombre - 14RR 12/349" → { nombre, codigo }. */
export function parseLabel(label: string): { nombre: string; codigo: string } {
  const trimmed = (label || "").trim();
  const match = LABEL_RE.exec(trimmed);
  if (match?.groups) {
    return {
      nombre: match.groups.nombre.trim(),
      codigo: match.groups.codigo.trim(),
    };
  }
  return { nombre: trimmed, codigo: "" };
}

/** Normaliza HEX a #RRGGBB mayúsculas. */
export function normalizeHex(hex: string | undefined | null): string {
  if (!hex) return "";
  let value = String(hex).trim();
  if (!value) return "";
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return "";
  return value.toUpperCase();
}

/** HEX → "r,g,b". */
export function hexToRgbString(hex: string): string {
  const n = normalizeHex(hex);
  if (!n) return "";
  const r = Number.parseInt(n.slice(1, 3), 16);
  const g = Number.parseInt(n.slice(3, 5), 16);
  const b = Number.parseInt(n.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: Number.parseInt(n.slice(1, 3), 16),
    g: Number.parseInt(n.slice(3, 5), 16),
    b: Number.parseInt(n.slice(5, 7), 16),
  };
}

/** Código Alba → nombre de archivo: "34YY 76/084" → "34YY76084". */
export function codigoToFileStem(codigo: string): string {
  return codigo.replace(/[\s/]/g, "").toUpperCase();
}

/** Ruta relativa CSV para la muestra. */
export function imagenCsvPath(codigo: string): string {
  const stem = codigoToFileStem(codigo);
  if (!stem) return "";
  return `imagenes/${stem}.jpg`;
}

function stripDiacritics(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "");
}

export function slugify(text: string): string {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function absoluteUrl(path: string): string {
  if (!path || path === "#") return "";
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ALBA_CONFIG.baseUrl}${p}`;
}

export function buildDetailUrl(nombre: string, codigo: string, ccid: string): string {
  const parts = [slugify(nombre)];
  if (codigo) parts.push(slugify(codigo));
  if (ccid) parts.push(ccid);
  return `${ALBA_CONFIG.baseUrl}${ALBA_CONFIG.pagePath}${parts.filter(Boolean).join("-")}`;
}

/**
 * Extrae un array JSON balanceando corchetes (el wall JSON es enorme y monolítico).
 */
export function extractBalancedJsonArray(html: string, start: number): string {
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return html.slice(start, j + 1);
    }
  }
  throw new Error("JSON de color wall incompleto en el HTML");
}

export function joinList(values: string[]): string {
  return values.filter(Boolean).join(";");
}
