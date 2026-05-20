const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type ResultadoExtraccionPrecio =
  | { ok: true; precio: number }
  | { ok: true; precio: null; motivo: "sin_precio_en_pagina" }
  | { ok: false; error: string };

/**
 * Obtiene el precio desde la URL manual de la ficha del producto en el competidor.
 */
export async function extraerPrecioDesdeUrlProducto(
  urlProducto: string
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

  const precio = pickBestPrice(parsePreciosFromHtml(html));
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
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}
