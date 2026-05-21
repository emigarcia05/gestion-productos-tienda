/** Miles con punto: 179.129, 1.234.567 */
const RE_SOLO_MILES_PUNTO = /^\d{1,3}(?:\.\d{3})+$/;

/** Miles con punto + centavos con coma: 1.234.567,89 */
const RE_MILES_PUNTO_DECIMAL_COMA = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/;

function enteroDesdeDigitos(digits: string): number | null {
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convierte texto de precio (formato argentino habitual) a entero en pesos.
 * No conserva centavos: solo la parte entera del monto.
 *
 * Ejemplos:
 * - "179.129" → 179129 (punto = miles)
 * - "1.234.567,50" → 1234567
 * - "179,50" → 179
 * - "179129" → 179129
 */
export function parsePrecioArgentino(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;
  const s = cleaned.replace(/\s/g, "");
  if (!s) return null;

  if (RE_MILES_PUNTO_DECIMAL_COMA.test(s)) {
    const [enteroPart] = s.split(",");
    return enteroDesdeDigitos(enteroPart.replace(/\./g, ""));
  }

  if (s.includes(",") && s.includes(".")) {
    const [enteroPart] = s.split(",");
    return enteroDesdeDigitos(enteroPart.replace(/\./g, ""));
  }

  if (s.includes(",") && !s.includes(".")) {
    const [enteroPart, dec] = s.split(",");
    if (dec?.length === 3 && enteroPart.length <= 3) {
      return enteroDesdeDigitos(enteroPart + dec);
    }
    return enteroDesdeDigitos(enteroPart);
  }

  if (s.includes(".")) {
    if (RE_SOLO_MILES_PUNTO.test(s)) {
      return enteroDesdeDigitos(s.replace(/\./g, ""));
    }
    const parts = s.split(".");
    if (parts.length >= 2 && parts.slice(1).every((p) => p.length === 3)) {
      return enteroDesdeDigitos(s.replace(/\./g, ""));
    }
    if (parts.length === 2 && parts[1].length === 3) {
      return enteroDesdeDigitos(parts[0] + parts[1]);
    }
    if (parts.length === 2 && parts[1].length <= 2) {
      return enteroDesdeDigitos(parts[0]);
    }
  }

  if (/^\d+$/.test(s)) {
    return enteroDesdeDigitos(s);
  }

  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
