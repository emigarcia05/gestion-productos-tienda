/**
 * Parseo de la respuesta de ChatGPT (tabla de coincidencias Alba)
 * para el PDF de aproximación de código desde imagen.
 */

import type { RgbColor } from "@/lib/colorMuestraImagen";
import { rgbToHex } from "@/lib/colorMuestraImagen";

export interface CoincidenciaAlbaPdf {
  nombre: string;
  codigo: string;
  similitud: string;
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
  // Evitar confundir códigos Alba tipo "30/100" — ya filtramos por 3 enteros 0–255.
  return { r, g, b };
}

function esHeaderSimilitud(cell: string): boolean {
  return /similitud|aprox/i.test(cell);
}

function esCeldaColor(cell: string): boolean {
  return parseRgbCelda(cell) != null || normalizarHex(cell) != null;
}

/**
 * Extrae hasta 5 filas de la tabla markdown.
 * Formatos: Nombre|Código|Similitud · +RGB · +HEX · +RGB+Similitud.
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
    if (joined.includes("nombre") && (joined.includes("código") || joined.includes("codigo"))) {
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

    for (let i = 2; i < cells.length; i += 1) {
      const cell = cells[i] ?? "";
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
      if (!similitud && (/%/.test(cell) || esHeaderSimilitud(cell) || cells.length === 3)) {
        if (!esCeldaColor(cell)) {
          similitud = cell;
        }
      } else if (!similitud && !esCeldaColor(cell)) {
        similitud = cell;
      }
    }

    if (!similitud && cells.length >= 3) {
      const last = cells[cells.length - 1] ?? "";
      if (!esCeldaColor(last)) similitud = last;
    }

    if (!rgb && hex) rgb = hexToRgbLocal(hex);
    if (!hex && rgb) hex = rgbToHex(rgb);

    rows.push({ nombre, codigo, similitud, rgb, hex });
    if (rows.length >= 5) break;
  }
  return rows;
}
