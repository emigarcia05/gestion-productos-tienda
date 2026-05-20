import { normalizeWebUrl } from "@/services/competencia.service";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface ProductoBusquedaCompetencia {
  codTienda: string;
  descripcionTienda: string | null;
  codExt: string;
}

/**
 * Intenta obtener el precio de venta en el sitio del competidor.
 * Estrategia genérica: varias URLs de búsqueda + heurística sobre el HTML.
 * Sitios con markup propio pueden requerir ajuste futuro por competidor.
 */
export async function extraerPrecioCompetenciaDesdeWeb(
  webBase: string,
  producto: ProductoBusquedaCompetencia,
  urlBusquedaPlantilla?: string | null
): Promise<number | null> {
  const termino = (producto.descripcionTienda ?? producto.codTienda).trim();
  if (!termino) return null;

  const base = normalizeWebUrl(webBase);
  const urls = buildSearchUrls(base, termino, urlBusquedaPlantilla);

  for (const url of urls) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const precio = pickBestPrice(parsePreciosFromHtml(html));
    if (precio != null) return precio;
  }

  return null;
}

function buildSearchUrls(
  base: string,
  termino: string,
  urlBusquedaPlantilla?: string | null
): string[] {
  const q = encodeURIComponent(termino);
  const urls: string[] = [];

  const plantilla = (urlBusquedaPlantilla ?? "").trim();
  if (plantilla) {
    const resolved = plantilla
      .replace(/\{q\}/gi, q)
      .replace(/\{query\}/gi, q)
      .replace(/\{termino\}/gi, q);
    const withScheme =
      resolved.startsWith("http://") || resolved.startsWith("https://")
        ? resolved
        : `https://${resolved}`;
    urls.push(withScheme);
  }

  return [
    ...urls,
    `${base}/search?q=${q}`,
    `${base}/buscar?q=${q}`,
    `${base}/catalogsearch/result/?q=${q}`,
    `${base}?s=${q}`,
    `${base}/?search=${q}`,
  ];
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

/** Precios candidatos en ARS (descarta valores absurdos). */
export function parsePreciosFromHtml(html: string): number[] {
  const found = new Set<number>();

  const jsonLdPrice = /"price"\s*:\s*"?([\d]+(?:[.,]\d{1,2})?)"?/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonLdPrice.exec(html)) !== null) {
    pushPrice(found, m[1]);
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

function parsePrecioArgentino(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (s.includes(",")) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pickBestPrice(candidates: number[]): number | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return mid ?? null;
}
