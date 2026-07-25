/**
 * Catálogo Alba vía API interna + JSON SSR (sin scrapear cajas HTML).
 *
 * Fuentes (en orden de prioridad):
 * 1) POST /bin/api/colorPopUp → carta completa agrupada por familia
 * 2) script.js-carousel-data → href + colorId de la pared (384 colores)
 */
import { ALBA_CONFIG, COLOR_POPUP_URL, PALETTE_PAGE_URL } from "./config";
import { httpJson, httpText } from "./http";
import type {
  CatalogColor,
  ColorPopupResponse,
  WallEnrichment,
  WallHueBlock,
} from "./types";
import {
  absoluteUrl,
  buildDetailUrl,
  extractBalancedJsonArray,
  normalizeHex,
  parseLabel,
} from "./utils";

export async function fetchColorPopupCatalog(): Promise<CatalogColor[]> {
  const payload = await httpJson<ColorPopupResponse>(COLOR_POPUP_URL, {
    method: "POST",
    body: {},
  });
  const hues = payload.data?.colorsHues ?? {};
  const rows: CatalogColor[] = [];

  for (const [familia, group] of Object.entries(hues)) {
    for (const card of group.colorCardDetailsList ?? []) {
      const label = (card.label ?? "").trim();
      const { nombre, codigo } = parseLabel(label);
      const ccid = String(card.ccid ?? "").trim();
      const hex = normalizeHex(card.hex);
      const href = card.cta?.href;
      rows.push({
        ccid,
        codigo,
        nombre,
        label,
        hex,
        familia,
        subfamilia: "",
        url: absoluteUrl(href && href !== "#" ? href : "") || "",
        colorId: "",
        ambientes: [],
        superficies: [],
        descripcion_alba: "",
      });
    }
  }

  return rows;
}

export async function fetchWallEnrichment(): Promise<Map<string, WallEnrichment>> {
  const html = await httpText(PALETTE_PAGE_URL, { method: "GET" });
  const start = html.indexOf(ALBA_CONFIG.wallJsonMarker);
  if (start < 0) {
    return new Map();
  }

  const blob = extractBalancedJsonArray(html, start);
  const wall = JSON.parse(blob) as WallHueBlock[];
  const byCcid = new Map<string, WallEnrichment>();

  for (const hue of wall) {
    for (const item of hue.colors ?? []) {
      const color = item.color;
      if (!color?.ccid) continue;
      byCcid.set(String(color.ccid), {
        url: absoluteUrl(color.href ?? ""),
        colorId: String(color.id ?? "").trim(),
        hex: normalizeHex(color.hex),
      });
    }
  }

  return byCcid;
}

/**
 * Une API + wall. Ambientes oficiales solo si hay colorId
 * (Alba publica set fijo de habitaciones en CDN para ese id).
 */
export function mergeCatalog(
  apiRows: CatalogColor[],
  wallByCcid: Map<string, WallEnrichment>,
): CatalogColor[] {
  const ambientLabels = ALBA_CONFIG.ambientRooms.map((r) => r.label);
  const seen = new Set<string>();
  const merged: CatalogColor[] = [];

  for (const row of apiRows) {
    const wall = wallByCcid.get(row.ccid);
    const hex = row.hex || wall?.hex || "";
    const url =
      wall?.url ||
      row.url ||
      buildDetailUrl(row.nombre, row.codigo, row.ccid);
    const colorId = wall?.colorId || row.colorId || "";

    const dedupeKey = `${row.codigo}|${row.nombre.toLowerCase()}|${hex}|${row.ccid}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    merged.push({
      ...row,
      hex,
      url,
      colorId,
      ambientes: colorId ? [...ambientLabels] : [],
      superficies: [],
      descripcion_alba: "",
      subfamilia: "",
    });
  }

  merged.sort((a, b) => {
    const ac = a.codigo ? 0 : 1;
    const bc = b.codigo ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return (
      a.familia.localeCompare(b.familia, "es") ||
      a.nombre.localeCompare(b.nombre, "es") ||
      a.codigo.localeCompare(b.codigo)
    );
  });

  return merged;
}
