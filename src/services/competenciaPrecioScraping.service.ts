import {
  expandirSelectoresPrecio,
  ordenMetodosRegla,
  parseCompetenciaConfigExtraccion,
  reglaExtraccionParaVinculo,
  type MetodoExtraccion,
  type ReglaExtraccionPagina,
} from "@/lib/competenciaConfigExtraccion";
import { parsePrecioArgentino } from "@/lib/parsePrecioArgentino";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type ResultadoExtraccionPrecio =
  | { ok: true; precio: number }
  | { ok: true; precio: null; motivo: "sin_precio_en_pagina" }
  | { ok: false; error: string };

export interface OpcionesExtraccionPrecio {
  configExtraccion?: unknown;
  tipoPagina?: string | null;
}

/**
 * Obtiene el precio desde la URL manual de la ficha del producto en el competidor.
 * Usa reglas por tipo de página del competidor si están configuradas.
 */
export async function extraerPrecioDesdeUrlProducto(
  urlProducto: string,
  opciones?: OpcionesExtraccionPrecio
): Promise<ResultadoExtraccionPrecio> {
  const url = urlProducto.trim();
  if (!url) {
    return { ok: false, error: "URL de producto vacía." };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { ok: false, error: "URL de producto inválida." };
  }

  const html = await fetchHtml(parsed.toString());
  if (!html) {
    return { ok: false, error: "No se pudo descargar la página (timeout o HTTP error)." };
  }

  const config = parseCompetenciaConfigExtraccion(opciones?.configExtraccion ?? null);
  const regla = reglaExtraccionParaVinculo(config, opciones?.tipoPagina);

  const precio = await extraerPrecioDesdeHtml(html, regla);
  if (precio == null) {
    return { ok: true, precio: null, motivo: "sin_precio_en_pagina" };
  }
  return { ok: true, precio };
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    const text = await res.text();
    return text.length > 50 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function extraerPrecioDesdeHtml(
  html: string,
  regla: ReglaExtraccionPagina | null
): Promise<number | null> {
  if (regla) {
    const metodos = ordenMetodosRegla(regla);
    for (const metodo of metodos) {
      const candidatos = await candidatosPorMetodo(html, regla, metodo);
      const elegido = elegirPrecioConfigurado(candidatos, metodo);
      if (elegido != null) return elegido;
    }
    return null;
  }
  return pickBestPriceGenerico(parsePreciosFromHtml(html));
}

async function candidatosPorMetodo(
  html: string,
  regla: ReglaExtraccionPagina,
  metodo: MetodoExtraccion
): Promise<number[]> {
  switch (metodo) {
    case "json_ld":
      return regla.usarJsonLd ? parsePreciosJsonLd(html) : [];
    case "css":
      return parsePreciosPorSelectores(html, regla);
    case "regex":
      return parsePreciosPorRegex(html, regla.regexPrecio);
    case "generico":
      return parsePreciosFromHtml(html);
    default:
      return [];
  }
}

function elegirPrecioConfigurado(
  candidatos: number[],
  metodo: MetodoExtraccion
): number | null {
  if (candidatos.length === 0) return null;
  if (metodo === "css" || metodo === "regex" || metodo === "json_ld") {
    return candidatos[0] ?? null;
  }
  return pickBestPriceGenerico(candidatos);
}

async function parsePreciosPorSelectores(
  html: string,
  regla: ReglaExtraccionPagina
): Promise<number[]> {
  const elemento = regla.selectorPrecio?.trim();
  const contenedor = regla.selectorPrecioAlternativo?.trim();
  if (!elemento && !contenedor) return [];

  const attr = regla.atributoPrecio?.trim() || undefined;
  let scope = html;
  if (contenedor) {
    const fragmento = extraerHtmlFragmentoContenedor(html, contenedor);
    if (fragmento) scope = fragmento;
  }
  if (elemento) {
    const selectores = expandirSelectoresPrecio(elemento);
    return parsePreciosPorSelectoresEnHtml(scope, selectores, attr);
  }
  return parsePreciosPorSelectoresEnHtml(scope, [contenedor!], attr);
}

/** Recorta el HTML al primer bloque que coincide con el contenedor (selector CSS simple). */
function extraerHtmlFragmentoContenedor(html: string, selector: string): string | null {
  const sel = selector.trim();
  if (!sel) return null;

  if (sel.startsWith(".")) {
    const cls = sel.slice(1).split(/[.\s#[]/)[0];
    if (!cls) return null;
    const openRe = new RegExp(
      `<([a-z][a-z0-9]*)[^>]*class=["'][^"']*\\b${escapeRe(cls)}\\b[^"']*["'][^>]*>`,
      "i"
    );
    const open = openRe.exec(html);
    if (!open || open.index == null) return null;
    const tag = open[1].toLowerCase();
    const start = open.index;
    const afterOpen = start + open[0].length;
    const closeTag = `</${tag}>`;
    const closeIdx = html.indexOf(closeTag, afterOpen);
    if (closeIdx === -1) return html.slice(start, Math.min(start + 12_000, html.length));
    return html.slice(start, closeIdx + closeTag.length);
  }

  if (sel.startsWith("#")) {
    const id = sel.slice(1).split(/[.\s[]/)[0];
    if (!id) return null;
    const openRe = new RegExp(
      `<([a-z][a-z0-9]*)[^>]*id=["']${escapeRe(id)}["'][^>]*>`,
      "i"
    );
    const open = openRe.exec(html);
    if (!open || open.index == null) return null;
    const tag = open[1].toLowerCase();
    const start = open.index;
    const afterOpen = start + open[0].length;
    const closeTag = `</${tag}>`;
    const closeIdx = html.indexOf(closeTag, afterOpen);
    if (closeIdx === -1) return html.slice(start, Math.min(start + 12_000, html.length));
    return html.slice(start, closeIdx + closeTag.length);
  }

  const texto = extraerTextoPorSelectorRegex(html, sel, undefined);
  if (texto) {
    const idx = html.indexOf(texto);
    if (idx >= 0) {
      const start = Math.max(0, idx - 2000);
      const end = Math.min(html.length, idx + 2000);
      return html.slice(start, end);
    }
  }
  return null;
}

function parsePreciosPorSelectoresSync(
  html: string,
  selectores: string[],
  attr: string | undefined,
  found: number[]
): number[] {
  for (const selector of selectores) {
    const fromRegex = extraerTextoPorSelectorRegex(html, selector, attr);
    if (fromRegex) {
      const n = parsePrecioArgentino(fromRegex);
      if (n != null) found.push(n);
      if (found.length > 0) return found;
    }
  }
  return found;
}

/** Fallback sin cheerio para selectores simples. */
function extraerTextoPorSelectorRegex(
  html: string,
  selector: string,
  attr?: string
): string | null {
  const sel = selector.trim();
  if (!sel) return null;

  const idPrefijo = /\[id\^=["']([^"']+)["']\]/i.exec(sel);
  if (idPrefijo) {
    const prefijo = idPrefijo[1];
    const re = new RegExp(
      `id=["'](${escapeRe(prefijo)}[^"']*)["'][^>]*>([^<]{1,120})<`,
      "i"
    );
    const m = re.exec(html);
    if (m) return m[2];
    const contentRe = new RegExp(
      `id=["'](${escapeRe(prefijo)}[^"']*)["'][^>]*content=["']([^"']+)["']`,
      "i"
    );
    const m2 = contentRe.exec(html);
    if (m2) return m2[2];
  }

  const itemprop = /\[itemprop=["']?([^"'\]]+)["']?\]/i.exec(sel);
  if (itemprop) {
    const prop = itemprop[1];
    const contentRe = new RegExp(
      `itemprop=["']${escapeRe(prop)}["'][^>]*content=["']([^"']+)["']`,
      "i"
    );
    const m1 = contentRe.exec(html);
    if (m1) return m1[1];
    const innerRe = new RegExp(`itemprop=["']${escapeRe(prop)}["'][^>]*>([^<]{1,80})<`, "i");
    const m2 = innerRe.exec(html);
    if (m2) return m2[1];
  }

  if (sel.startsWith(".")) {
    const cls = sel.slice(1).split(/[.\s#[]/)[0];
    if (cls) {
      const re = new RegExp(
        `class=["'][^"']*\\b${escapeRe(cls)}\\b[^"']*["'][^>]*>([^<]{1,120})<`,
        "i"
      );
      const m = re.exec(html);
      if (m) return m[1];
    }
  }

  if (sel.startsWith("#")) {
    const id = sel.slice(1).split(/[.\s[]/)[0];
    if (id) {
      const re = new RegExp(`id=["']${escapeRe(id)}["'][^>]*>([^<]{1,120})<`, "i");
      const m = re.exec(html);
      if (m) return m[1];
    }
  }

  if (attr) {
    const attrRe = new RegExp(`${escapeRe(attr)}=["']([^"']+)["']`, "gi");
    const m = attrRe.exec(html);
    if (m) return m[1];
  }

  const dataPrice = /data-price=["']([^"']+)["']/i.exec(html);
  if (dataPrice) return dataPrice[1];

  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePreciosPorSelectoresEnHtml(
  html: string,
  selectores: string[],
  attr?: string
): number[] {
  return parsePreciosPorSelectoresSync(html, selectores, attr, []);
}

function parsePreciosPorRegex(html: string, pattern?: string): number[] {
  const p = pattern?.trim();
  if (!p) return [];
  try {
    const re = new RegExp(p, "i");
    const m = re.exec(html);
    if (!m?.[1]) return [];
    const n = parsePrecioArgentino(m[1]);
    return n != null ? [n] : [];
  } catch {
    return [];
  }
}

export function parsePreciosJsonLd(html: string): number[] {
  const found = new Set<number>();
  const scriptRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let block: RegExpExecArray | null;
  while ((block = scriptRe.exec(html)) !== null) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      collectPricesFromJsonLd(data, found);
    } catch {
      collectPricesFromJsonLdString(raw, found);
    }
  }
  return [...found];
}

function collectPricesFromJsonLdString(raw: string, found: Set<number>): void {
  const priceRe = /"price"\s*:\s*"?([\d]+(?:[.,]\d{1,2})?)"?/gi;
  let m: RegExpExecArray | null;
  while ((m = priceRe.exec(raw)) !== null) {
    pushPrice(found, m[1]);
  }
}

function collectPricesFromJsonLd(node: unknown, found: Set<number>): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectPricesFromJsonLd(item, found);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.price === "number" || typeof obj.price === "string") {
    pushPrice(found, String(obj.price));
  }
  if (obj.offers) collectPricesFromJsonLd(obj.offers, found);
  if (obj["@graph"]) collectPricesFromJsonLd(obj["@graph"], found);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") collectPricesFromJsonLd(v, found);
  }
}

export function parsePreciosFromHtml(html: string): number[] {
  const found = new Set<number>();
  for (const n of parsePreciosJsonLd(html)) found.add(n);

  const metaPrices = [
    /property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/gi,
    /property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/gi,
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/gi,
  ];
  let m: RegExpExecArray | null;
  for (const re of metaPrices) {
    while ((m = re.exec(html)) !== null) {
      pushPrice(found, m[1]);
    }
  }

  const moneyPatterns = [
    /\$\s*([\d]{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
    /(?:precio|price|venta)[^>]{0,40}?([\d]{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    /(?:precio|price|venta)[^>]{0,40}?([\d]+(?:[.,]\d{2}))/gi,
  ];

  for (const re of moneyPatterns) {
    while ((m = re.exec(html)) !== null) {
      pushPrice(found, m[1]);
    }
  }

  return [...found];
}

function pushPrice(set: Set<number>, raw: string): void {
  const n = parsePrecioArgentino(raw);
  if (n != null && n >= 10 && n <= 50_000_000) set.add(n);
}

/** Heurística genérica sin reglas: mediana para descartar outliers en páginas ruidosas. */
function pickBestPriceGenerico(candidates: number[]): number | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}
