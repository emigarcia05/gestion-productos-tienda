export const DUX_BASE_URL = "https://erp.duxsoftware.com.ar/WSERP/rest/services/items";

// IDs fijos de precios y sucursales en el sistema Dux de TiendaColor
export const ID_PRECIO_LISTA      = 56994;
export const ID_PRECIO_MAYORISTA  = 57160;
export const ID_STOCK_GUAYMALLEN  = 4565;
export const ID_STOCK_MAIPU       = 16923;

export interface ItemDux {
  codItem:         string;
  descripcion:     string;
  rubro:           string | null;
  subRubro:        string | null;
  marca:           string | null;
  proveedorDux:    string | null;
  codigoExterno:   string | null;
  costo:           number;
  porcIva:         number;
  precioLista:     number;
  precioMayorista: number;
  stockGuaymallen: number;
  stockMaipu:      number;
  habilitado:      boolean;
}

export function parseNum(val: unknown): number {
  const n = parseFloat(String(val ?? "0"));
  return isNaN(n) ? 0 : n;
}

/** Forma esperada de un ítem en la respuesta JSON de la API Dux (campos opcionales). */
interface ItemDuxRaw {
  cod_item?: unknown;
  item?: unknown;
  rubro?: { nombre?: string } | null;
  sub_rubro?: { nombre?: string } | null;
  marca?: { marca?: string } | null;
  proveedor?: { proveedor?: string } | null;
  codigo_externo?: string | null;
  costo?: unknown;
  porc_iva?: unknown;
  precios?: Array<{ id: number; precio?: unknown }>;
  stock?: Array<{ id: number; stock_real?: unknown }>;
  habilitado?: string;
}

function isItemDuxRaw(val: unknown): val is ItemDuxRaw {
  return val !== null && typeof val === "object";
}

export function mapItem(raw: unknown): ItemDux {
  if (!isItemDuxRaw(raw)) {
    return {
      codItem: "", descripcion: "", rubro: null, subRubro: null, marca: null,
      proveedorDux: null, codigoExterno: null, costo: 0, porcIva: 0,
      precioLista: 0, precioMayorista: 0, stockGuaymallen: 0, stockMaipu: 0,
      habilitado: false,
    };
  }
  const precioMap: Record<number, number> = {};
  if (Array.isArray(raw.precios)) {
    for (const p of raw.precios) precioMap[p.id] = parseNum(p.precio);
  }
  const stockMap: Record<number, number> = {};
  if (Array.isArray(raw.stock)) {
    for (const s of raw.stock) stockMap[s.id] = parseNum(s.stock_real);
  }
  return {
    codItem:         String(raw.cod_item ?? ""),
    descripcion:     String(raw.item ?? ""),
    rubro:           raw.rubro?.nombre ?? null,
    subRubro:        raw.sub_rubro?.nombre ?? null,
    marca:           raw.marca?.marca ?? null,
    proveedorDux:    raw.proveedor?.proveedor ?? null,
    codigoExterno:   raw.codigo_externo ?? null,
    costo:           parseNum(raw.costo),
    porcIva:         parseNum(raw.porc_iva),
    precioLista:     precioMap[ID_PRECIO_LISTA]     ?? 0,
    precioMayorista: precioMap[ID_PRECIO_MAYORISTA] ?? 0,
    stockGuaymallen: stockMap[ID_STOCK_GUAYMALLEN]  ?? 0,
    stockMaipu:      stockMap[ID_STOCK_MAIPU]       ?? 0,
    habilitado:      raw.habilitado === "S",
  };
}

const FETCH_LIMIT = 1000;

/** Límite máximo por petición que permite la API DUX (50 ítems). */
export const DUX_API_PAGE_LIMIT = 50;

export interface FetchItemsPageResult {
  results: ItemDux[];
  total: number;
  hasMore: boolean;
}

/**
 * Obtiene una página de ítems de la API DUX (limit=50 por restricción de la API).
 * Para sincronización paginada con lista_precios_tienda.
 */
export async function fetchItemsPage(offset: number, limit: number = DUX_API_PAGE_LIMIT): Promise<FetchItemsPageResult> {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: token,
  };

  const url = `${DUX_BASE_URL}?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers, cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Error API Dux: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const rawResults: unknown[] = json.results ?? [];
  const total = Number(json.paging?.total ?? 0);
  const results = rawResults.map(mapItem);

  return {
    results,
    total,
    hasMore: rawResults.length > 0 && offset + rawResults.length < total,
  };
}

export async function fetchTodosLosItems(): Promise<ItemDux[]> {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");

  const headers = {
    accept: "application/json",
    authorization: token,
  };

  const todos: ItemDux[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = `${DUX_BASE_URL}?limit=${FETCH_LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Error API Dux: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const results: unknown[] = json.results ?? [];
    total = Number(json.paging?.total ?? results.length);

    if (results.length === 0) break;

    todos.push(...results.map(mapItem));
    offset += FETCH_LIMIT;

    // Pequeña pausa entre requests para no saturar la API
    if (offset < total) await new Promise((r) => setTimeout(r, 300));
  }

  return todos;
}
