/**
 * Derivaciones objetivas desde HEX/RGB + metadatos oficiales (familia/ambientes).
 * No inventa textos de marketing de Alba: reglas deterministas de colorimetría.
 */
import type { AlbaConocimientoCsvRow, CatalogColor, Temperatura } from "./types";
import { hexToRgb, joinList } from "./utils";

export interface Hsl {
  h: number; // 0–360
  s: number; // 0–1
  l: number; // 0–1
}

/** Luminancia relativa WCAG (0–1). */
export function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
      break;
  }
  return { h, s, l };
}

/** Escala 1–10 desde valor 0–1. */
export function scale1to10(value01: number): number {
  const n = Math.round(value01 * 9) + 1;
  return Math.min(10, Math.max(1, n));
}

export function temperaturaFromHsl(hsl: Hsl): Temperatura {
  // Baja saturación → neutro; tonos cálidos ~ rojo–amarillo; fríos ~ verde–azul–violeta.
  if (hsl.s < 0.08) return "Neutro";
  const h = hsl.h;
  if (h < 70 || h >= 330) return "Cálido";
  if (h >= 70 && h < 160) return hsl.s < 0.2 ? "Neutro" : "Cálido";
  if (h >= 160 && h < 280) return "Frío";
  return "Cálido";
}

export function nivelLuminosidad(score: number): string {
  if (score <= 2) return "Muy Bajo";
  if (score <= 4) return "Bajo";
  if (score <= 6) return "Medio";
  if (score <= 8) return "Alto";
  return "Muy Alto";
}

export function nivelSaturacion(score: number): string {
  if (score <= 2) return "Muy Baja";
  if (score <= 4) return "Baja";
  if (score <= 6) return "Media";
  if (score <= 8) return "Alta";
  return "Muy Alta";
}

/**
 * Etiqueta visual por región HSL (determinista).
 */
export function familiaVisual(hsl: Hsl, temp: Temperatura): string {
  const { h, s, l } = hsl;
  if (s < 0.06) {
    if (l >= 0.92) return "Perla";
    if (l >= 0.82) return "Hueso";
    if (l >= 0.65) return temp === "Cálido" ? "Arena" : "Piedra";
    if (l >= 0.4) return temp === "Cálido" ? "Humo" : "Grafito";
    return "Grafito";
  }
  if (l >= 0.88 && s < 0.25) return "Marfil";
  if (h >= 15 && h < 45 && s >= 0.25 && l < 0.55) return "Terracota";
  if (h >= 20 && h < 50 && l < 0.35) return "Chocolate";
  if (h >= 55 && h < 95 && s >= 0.35) return "Lima";
  if (h >= 70 && h < 110 && s < 0.45 && l < 0.55) return "Oliva";
  if (h >= 180 && h < 250) return l > 0.55 ? "Azulado" : "Azulado";
  if (h >= 90 && h < 170) return "Verdoso";
  if (s < 0.18) return temp === "Cálido" ? "Gris cálido" : "Gris frío";
  if (temp === "Cálido" && h < 50) return l > 0.6 ? "Arena" : "Terracota";
  if (temp === "Frío") return "Azulado";
  return "Piedra";
}

function estilosFromMetrics(
  temp: Temperatura,
  lum: number,
  sat: number,
): string[] {
  const out: string[] = [];
  if (lum >= 7 && sat <= 4) out.push("Minimalista", "Nórdico", "Japandi");
  if (temp === "Cálido" && lum >= 5 && sat <= 6) out.push("Rústico", "Mediterráneo");
  if (temp === "Frío" && lum <= 5) out.push("Industrial", "Contemporáneo");
  if (sat >= 7) out.push("Pop", "Maximalista");
  if (lum <= 3) out.push("Dramático");
  if (out.length === 0) out.push("Contemporáneo");
  return [...new Set(out)];
}

function ambientesRecomendados(
  lum: number,
  sat: number,
  temp: Temperatura,
  oficiales: string[],
): string[] {
  // Si Alba publicó ambientes en ficha/CDN, se priorizan como base objetiva.
  if (oficiales.length > 0) return oficiales;

  const out: string[] = [];
  if (lum >= 7) out.push("Living", "Comedor", "Cocina");
  if (lum >= 5 && sat <= 5) out.push("Dormitorio", "Pasillo");
  if (temp === "Frío" && lum <= 5) out.push("Baño", "Home office");
  if (temp === "Cálido" && sat >= 5) out.push("Comedor", "Living");
  if (out.length === 0) out.push("Living");
  return [...new Set(out)];
}

function combinaCon(temp: Temperatura, lum: number, sat: number): string[] {
  const out = ["Blanco"];
  if (temp === "Cálido") out.push("Madera clara", "Beige");
  if (temp === "Frío") out.push("Gris claro", "Negro mate");
  if (temp === "Neutro") out.push("Madera clara", "Negro mate");
  if (lum <= 4) out.push("Blanco roto");
  if (sat >= 6) out.push("Neutros");
  return [...new Set(out)];
}

function contrastaCon(temp: Temperatura, lum: number): string[] {
  const out: string[] = [];
  if (lum >= 7) out.push("Negro mate", "Grafito");
  else out.push("Blanco", "Crema");
  if (temp === "Cálido") out.push("Azul profundo");
  if (temp === "Frío") out.push("Terracota", "Mostaza");
  if (temp === "Neutro") out.push("Verde oliva");
  return [...new Set(out)];
}

function sensacionVisual(
  temp: Temperatura,
  lum: number,
  sat: number,
): string {
  // Una sola cadena con términos del vocabulario permitido.
  const terms: string[] = [];
  if (lum >= 7) terms.push("Luminoso", "Amplio");
  else if (lum <= 3) terms.push("Profundo");
  else terms.push("Suave");

  if (temp === "Cálido") terms.push("Cálido", "Acogedor");
  else if (temp === "Frío") terms.push("Frío", "Sereno");
  else terms.push("Neutro", "Elegante");

  if (sat <= 3) terms.push("Sobrio");
  else if (sat >= 7) terms.push("Alegre");
  else terms.push("Natural");

  if (lum >= 6 && sat <= 4) terms.push("Moderno");

  // Deduplicar preservando orden; limitar a 4 términos para legibilidad.
  return [...new Set(terms)].slice(0, 4).join(";");
}

function descripcionTecnica(
  familiaVisualLabel: string,
  temp: Temperatura,
  lum: number,
  sat: number,
  nivelLum: string,
  nivelSat: string,
): string {
  const efecto =
    lum >= 7 ? "aporta amplitud visual" : lum <= 3 ? "genera profundidad" : "equilibra el espacio";
  return `${familiaVisualLabel} ${temp.toLowerCase()} de luminosidad ${nivelLum.toLowerCase()} (${lum}/10) y saturación ${nivelSat.toLowerCase()} (${sat}/10) que ${efecto}.`;
}

/** Construye la fila de conocimiento para un color del catálogo. */
export function buildConocimientoRow(color: CatalogColor): AlbaConocimientoCsvRow {
  const rgb = hexToRgb(color.hex);
  if (!rgb) {
    return {
      codigo: color.codigo,
      nombre: color.nombre,
      temperatura: "",
      luminosidad: "",
      saturacion: "",
      familia_visual: "",
      estilos_recomendados: "",
      ambientes_recomendados: joinList(color.ambientes),
      combina_con: "",
      contrasta_con: "",
      descripcion_tecnica: "",
      nivel_luminosidad: "",
      nivel_saturacion: "",
      sensacion_visual: "",
    };
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const Y = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const lum = scale1to10(Y);
  const sat = scale1to10(hsl.s);
  const temp = temperaturaFromHsl(hsl);
  const fv = familiaVisual(hsl, temp);
  const nLum = nivelLuminosidad(lum);
  const nSat = nivelSaturacion(sat);

  return {
    codigo: color.codigo,
    nombre: color.nombre,
    temperatura: temp,
    luminosidad: String(lum),
    saturacion: String(sat),
    familia_visual: fv,
    estilos_recomendados: joinList(estilosFromMetrics(temp, lum, sat)),
    ambientes_recomendados: joinList(
      ambientesRecomendados(lum, sat, temp, color.ambientes),
    ),
    combina_con: joinList(combinaCon(temp, lum, sat)),
    contrasta_con: joinList(contrastaCon(temp, lum)),
    descripcion_tecnica: descripcionTecnica(fv, temp, lum, sat, nLum, nSat),
    nivel_luminosidad: nLum,
    nivel_saturacion: nSat,
    sensacion_visual: sensacionVisual(temp, lum, sat),
  };
}
