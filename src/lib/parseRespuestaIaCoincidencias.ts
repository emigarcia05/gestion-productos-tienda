/**
 * Parseo de la respuesta de ChatGPT (tabla de coincidencias Alba)
 * para el PDF de aproximación de código desde imagen.
 */

export interface CoincidenciaAlbaPdf {
  nombre: string;
  codigo: string;
  similitud: string;
  /** HEX opcional (#RRGGBB) si la IA lo incluye. */
  hex: string | null;
}

function normalizarHex(raw: string): string | null {
  const t = raw.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(t)) return null;
  return `#${t.toUpperCase()}`;
}

/**
 * Extrae hasta 5 filas de la tabla markdown de la respuesta.
 * Soporta 3 columnas (Nombre|Código|Similitud) o 4 (+ HEX).
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
    if (joined.includes("nombre") && joined.includes("código")) continue;
    if (joined.includes("nombre") && joined.includes("codigo")) continue;
    if (cells[0]?.includes("[Nombre]") || cells[1]?.includes("[Código]")) {
      continue;
    }

    const nombre = cells[0] ?? "";
    const codigo = cells[1] ?? "";
    let similitud = cells[2] ?? "";
    let hex: string | null = null;

    if (cells.length >= 4) {
      const maybeHex = normalizarHex(cells[2] ?? "");
      if (maybeHex) {
        hex = maybeHex;
        similitud = cells[3] ?? "";
      } else {
        hex = normalizarHex(cells[3] ?? "");
      }
    } else {
      for (const c of cells) {
        const h = normalizarHex(c);
        if (h) {
          hex = h;
          break;
        }
      }
    }

    if (!nombre || !codigo) continue;
    rows.push({ nombre, codigo, similitud, hex });
    if (rows.length >= 5) break;
  }
  return rows;
}
