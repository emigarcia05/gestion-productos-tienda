/**
 * Parseo de la respuesta de ChatGPT (tabla de coincidencias Alba)
 * para el PDF de aproximación de código desde imagen.
 *
 * Formato canónico:
 * | Nombre | Código | Similitud | URL | RGB (digital) |
 */

import type { RgbColor } from "@/lib/colorMuestraImagen";
import { rgbToHex } from "@/lib/colorMuestraImagen";

export interface CoincidenciaAlbaPdf {
  nombre: string;
  codigo: string;
  similitud: string;
  /** URL de la ficha oficial del color (hipervínculo en el PDF). */
  url: string | null;
  /** RGB digital del color (para rellenar el swatch; no se imprime el texto). */
  rgb: RgbColor | null;
  /** HEX derivado si hubo RGB/HEX en la respuesta. */
  hex: string | null;
}

function normalizarHex(raw: string): string | null {
  const t = raw.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(t)) return null;
  return `#${t.toUpperCase()}`;
}

function hexToRgbLocal(hex: string): RgbColor {
  const h = hex.replace(/^#/, "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

/** Acepta `(143,144,128)`, `143, 144, 128`, `RGB: (143,144,128)`, etc. */
export function parseRgbCelda(raw: string): RgbColor | null {
  const m = raw.match(
    /(?:rgb\s*[:=]?\s*)?\(?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?/i,
  );
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if ([r, g, b].some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return { r, g, b };
}

/** Extrae http(s) URL de una celda (markdown `[texto](url)` o URL cruda). */
export function parseUrlCelda(raw: string): string | null {
  const t = raw.trim();
  if (!t || /^\[?\s*url\s*\]?$/i.test(t)) return null;
  const md = t.match(/\((https?:\/\/[^)\s]+)\)/i);
  if (md?.[1]) return md[1];
  const plain = t.match(/https?:\/\/[^\s<>"|]+/i);
  if (!plain?.[0]) return null;
  return plain[0].replace(/[),.;]+$/, "");
}

function esHeaderSimilitud(cell: string): boolean {
  return /similitud|aprox/i.test(cell);
}

function esCeldaColor(cell: string): boolean {
  return parseRgbCelda(cell) != null || normalizarHex(cell) != null;
}

/**
 * Extrae hasta 5 filas de la tabla markdown.
 * Canónico: Nombre|Código|Similitud|URL|RGB.
 * Compat: formatos previos sin URL / con RGB+Similitud en otro orden.
 */
export function parseRespuestaIaCoincidencias(
  texto: string,
): CoincidenciaAlbaPdf[] {
  const rows: CoincidenciaAlbaPdf[] = [];
  for (const line of texto.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 3) continue;

    const joined = cells.join(" ").toLowerCase();
    if (
      joined.includes("nombre") &&
      (joined.includes("código") || joined.includes("codigo"))
    ) {
      continue;
    }
    if (cells[0]?.includes("[Nombre]") || cells[1]?.includes("[Código]")) {
      continue;
    }

    const nombre = cells[0] ?? "";
    const codigo = cells[1] ?? "";
    if (!nombre || !codigo) continue;

    let rgb: RgbColor | null = null;
    let hex: string | null = null;
    let similitud = "";
    let url: string | null = null;

    for (let i = 2; i < cells.length; i += 1) {
      const cell = cells[i] ?? "";
      if (!url) {
        const parsedUrl = parseUrlCelda(cell);
        if (parsedUrl) {
          url = parsedUrl;
          continue;
        }
      }
      if (!rgb) {
        const parsedRgb = parseRgbCelda(cell);
        if (parsedRgb) {
          rgb = parsedRgb;
          continue;
        }
      }
      if (!hex) {
        const parsedHex = normalizarHex(cell);
        if (parsedHex) {
          hex = parsedHex;
          continue;
        }
      }
      if (
        !similitud &&
        (/%/.test(cell) || esHeaderSimilitud(cell) || cells.length === 3)
      ) {
        if (!esCeldaColor(cell) && !parseUrlCelda(cell)) {
          similitud = cell;
        }
      } else if (!similitud && !esCeldaColor(cell) && !parseUrlCelda(cell)) {
        similitud = cell;
      }
    }

    if (!similitud && cells.length >= 3) {
      const candidate = cells[2] ?? "";
      if (!esCeldaColor(candidate) && !parseUrlCelda(candidate)) {
        similitud = candidate;
      }
    }

    if (!rgb && hex) rgb = hexToRgbLocal(hex);
    if (!hex && rgb) hex = rgbToHex(rgb);

    rows.push({ nombre, codigo, similitud, url, rgb, hex });
    if (rows.length >= 5) break;
  }
  return rows;
}
