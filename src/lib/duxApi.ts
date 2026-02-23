const BASE_URL = "https://erp.duxsoftware.com.ar/WSERP/rest/services/items";
const LIMIT = 1000;

// IDs fijos de precios y sucursales en el sistema Dux de TiendaColor
const ID_PRECIO_LISTA      = 56994;
const ID_PRECIO_MAYORISTA  = 57160;
const ID_STOCK_GUAYMALLEN  = 4565;
const ID_STOCK_MAIPU       = 16923;

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

function parseNum(val: unknown): number {
  const n = parseFloat(String(val ?? "0"));
  return isNaN(n) ? 0 : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(raw: any): ItemDux {
  const precioMap: Record<number, number> = {};
  if (Array.isArray(raw.precios)) {
    for (const p of raw.precios) precioMap[p.id] = parseNum(p.precio);
  }

  const stockMap: Record<number, number> = {};
  if (Array.isArray(raw.stock)) {
    for (const s of raw.stock) stockMap[s.id] = parseNum(s.stock_real);
  }

  return {
    codItem:         String(raw.cod_item),
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
    stockMaipu:      stockMap[ID_STOCK_MAIPU]        ?? 0,
    habilitado:      raw.habilitado === "S",
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
    const url = `${BASE_URL}?limit=${LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Error API Dux: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const results: unknown[] = json.results ?? [];
    total = Number(json.paging?.total ?? results.length);

    if (results.length === 0) break;

    todos.push(...results.map(mapItem));
    offset += LIMIT;

    // Pequeña pausa entre requests para no saturar la API
    if (offset < total) await new Promise((r) => setTimeout(r, 300));
  }

  return todos;
}
