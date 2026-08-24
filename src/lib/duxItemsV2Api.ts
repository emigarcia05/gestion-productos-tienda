import { getDuxIdEmpresaCompras } from "@/lib/duxComprasV2Api";
import { DUX_API_BATCH_INTERVAL_MS } from "@/lib/duxApiBatchPolicy";

export const DUX_ITEMS_V2_BASE_URL =
  "https://erp.duxsoftware.com.ar/WSERP/rest/services/v2/items";

const FETCH_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.DUX_FETCH_TIMEOUT_MS) || 30_000
);

export type DuxPutItemResult = {
  httpStatus: number;
  ok: boolean;
  respuesta: string;
};

export type DuxV2ItemStock = {
  id: number;
  stockDisponible: number | null;
};

export type DuxV2ItemPrecio = {
  id: number;
  precio: number;
};

export type DuxV2ItemFicha = {
  codItem: string;
  item: string;
  porcIva: number;
  costo: number;
  idRubro: number | null;
  idSubRubro: number | null;
  codigoMarca: string | null;
  idProveedor: number | null;
  codigoExterno: string | null;
  ctdUnidadesPorBulto: number | null;
  codigosBarra: string[];
  precios: DuxV2ItemPrecio[];
  stock: DuxV2ItemStock[];
};

export type DuxV2GuardarItemRequest = {
  id_personal: number;
  tipo_producto: string;
  cod_item: string;
  item: string;
  id_moneda: number;
  porc_iva: number;
  costo_compra: number;
  id_unidad_medida: number;
  sucursales_habilitadas: { id_sucursal: number }[];
  id_rubro?: number;
  id_sub_rubro?: number;
  cod_marca?: string;
  id_proveedor?: number;
  codigo_externo?: string;
  ctd_unidades_por_bulto?: number;
  item_cod_barra?: { cod_barra: string }[];
  precios?: {
    id_lista_precio: number;
    id_moneda: number;
    valor: number;
  }[];
  stock: {
    id_deposito: number;
    ctd_disponible: number;
  }[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function nestedId(v: unknown): number | null {
  if (!isRecord(v)) return null;
  return asFiniteNumber(v.id);
}

function formatDuxItemsV2Error(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { mensaje?: string };
    };
    const msg = parsed.error?.mensaje?.trim();
    if (msg) return msg;
  } catch {
    // cuerpo no JSON
  }
  const trimmed = bodyText.trim();
  if (trimmed) return trimmed.slice(0, 500);
  return `HTTP ${status}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDuxApiToken(): string {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");
  return token;
}

function getDuxIdMoneda(): number {
  const n = Number(process.env.DUX_ID_MONEDA ?? "1");
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}

function getDuxIdUnidadMedida(): number {
  const n = Number(process.env.DUX_ID_UNIDAD_MEDIDA ?? "1");
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}

function getDuxTipoProducto(): string {
  const raw = process.env.DUX_TIPO_PRODUCTO?.trim();
  return raw && raw.length > 0 ? raw : "SIMPLE";
}

async function duxItemsV2Fetch(
  url: string,
  init: RequestInit
): Promise<{ status: number; ok: boolean; text: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return { status: res.status, ok: res.ok, text };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("La petición a DUX no respondió a tiempo.");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseStockArray(raw: unknown): DuxV2ItemStock[] {
  if (!Array.isArray(raw)) return [];
  const out: DuxV2ItemStock[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const id = asFiniteNumber(row.id);
    if (id == null) continue;
    out.push({
      id,
      stockDisponible: asFiniteNumber(row.stock_disponible),
    });
  }
  return out;
}

function parsePreciosArray(raw: unknown): DuxV2ItemPrecio[] {
  if (!Array.isArray(raw)) return [];
  const out: DuxV2ItemPrecio[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const id = asFiniteNumber(row.id);
    const precio = asFiniteNumber(row.precio);
    if (id == null || precio == null) continue;
    out.push({ id, precio });
  }
  return out;
}

function parseCodigosBarra(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    const s = asString(x);
    if (s) out.push(s);
  }
  return out;
}

function parseFichaItemV2(raw: unknown): DuxV2ItemFicha | null {
  if (!isRecord(raw)) return null;
  const codItem = asString(raw.cod_item);
  const item = asString(raw.item);
  if (!codItem || !item) return null;
  const marca = isRecord(raw.marca) ? raw.marca : null;
  const proveedor = isRecord(raw.proveedor) ? raw.proveedor : null;
  return {
    codItem,
    item,
    porcIva: asFiniteNumber(raw.porc_iva) ?? 0,
    costo: asFiniteNumber(raw.costo) ?? 0,
    idRubro: nestedId(raw.rubro),
    idSubRubro: nestedId(raw.sub_rubro),
    codigoMarca: marca ? asString(marca.codigo_marca) : null,
    idProveedor: proveedor ? asFiniteNumber(proveedor.id_proveedor) : null,
    codigoExterno: asString(raw.codigo_externo),
    ctdUnidadesPorBulto: asFiniteNumber(raw.ctd_unidades_por_bulto),
    codigosBarra: parseCodigosBarra(raw.codigos_barra),
    precios: parsePreciosArray(raw.precios),
    stock: parseStockArray(raw.stock),
  };
}

/**
 * GET `/v2/items?cod_item=` — ficha actual (no envía id_empresa; WSERP no filtra por empresa).
 * Contrato: https://duxsoftware.readme.io/reference/listar_items
 */
export async function getItemV2PorCod(
  codItem: string
): Promise<
  | { ok: true; ficha: DuxV2ItemFicha }
  | { ok: false; httpStatus: number; respuesta: string }
> {
  const token = getDuxApiToken();
  const url =
    `${DUX_ITEMS_V2_BASE_URL}?cod_item=${encodeURIComponent(codItem)}` +
    `&limit=1&offset=0`;
  const res = await duxItemsV2Fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    return {
      ok: false,
      httpStatus: res.status,
      respuesta: formatDuxItemsV2Error(res.status, res.text),
    };
  }
  let parsed: unknown = {};
  try {
    parsed = res.text.trim() ? JSON.parse(res.text) : {};
  } catch {
    return {
      ok: false,
      httpStatus: res.status,
      respuesta: "Respuesta GET DUX no es JSON.",
    };
  }
  const datos =
    isRecord(parsed) && Array.isArray(parsed.datos) ? parsed.datos : [];
  const ficha = datos.length > 0 ? parseFichaItemV2(datos[0]) : null;
  if (!ficha) {
    return {
      ok: false,
      httpStatus: 404,
      respuesta: `Ítem ${codItem} no encontrado en DUX.`,
    };
  }
  return { ok: true, ficha };
}

export function armarBodyGuardarItemV2(input: {
  ficha: DuxV2ItemFicha;
  idPersonal: number;
  idDeposito: number;
  stock: number;
  sucursalesHabilitadas: { id_sucursal: number }[];
}): DuxV2GuardarItemRequest {
  const idMoneda = getDuxIdMoneda();
  const stockMap = new Map<number, number>();
  for (const s of input.ficha.stock) {
    stockMap.set(s.id, s.stockDisponible ?? 0);
  }
  stockMap.set(input.idDeposito, input.stock);

  const body: DuxV2GuardarItemRequest = {
    id_personal: input.idPersonal,
    tipo_producto: getDuxTipoProducto(),
    cod_item: input.ficha.codItem,
    item: input.ficha.item,
    id_moneda: idMoneda,
    porc_iva: input.ficha.porcIva,
    costo_compra: input.ficha.costo,
    id_unidad_medida: getDuxIdUnidadMedida(),
    sucursales_habilitadas: input.sucursalesHabilitadas,
    stock: [...stockMap.entries()].map(([id_deposito, ctd_disponible]) => ({
      id_deposito,
      ctd_disponible,
    })),
  };

  if (input.ficha.idRubro != null) body.id_rubro = input.ficha.idRubro;
  if (input.ficha.idSubRubro != null) body.id_sub_rubro = input.ficha.idSubRubro;
  if (input.ficha.codigoMarca) body.cod_marca = input.ficha.codigoMarca;
  if (input.ficha.idProveedor != null) {
    body.id_proveedor = input.ficha.idProveedor;
  }
  if (input.ficha.codigoExterno) body.codigo_externo = input.ficha.codigoExterno;
  if (input.ficha.ctdUnidadesPorBulto != null) {
    body.ctd_unidades_por_bulto = input.ficha.ctdUnidadesPorBulto;
  }
  if (input.ficha.codigosBarra.length > 0) {
    body.item_cod_barra = input.ficha.codigosBarra.map((cod_barra) => ({
      cod_barra,
    }));
  }
  if (input.ficha.precios.length > 0) {
    body.precios = input.ficha.precios.map((p) => ({
      id_lista_precio: p.id,
      id_moneda: idMoneda,
      valor: p.precio,
    }));
  }
  return body;
}

/**
 * PUT `/v2/items/{cod_item}?id_empresa=` — ficha completa (no es PATCH).
 * Contrato: https://duxsoftware.readme.io/reference/actualizar_item
 */
export async function putItemV2(
  codItem: string,
  body: DuxV2GuardarItemRequest
): Promise<DuxPutItemResult> {
  const token = getDuxApiToken();
  const idEmpresa = getDuxIdEmpresaCompras();
  const url =
    `${DUX_ITEMS_V2_BASE_URL}/${encodeURIComponent(codItem)}` +
    `?id_empresa=${encodeURIComponent(String(idEmpresa))}`;
  const res = await duxItemsV2Fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return {
    httpStatus: res.status,
    ok: res.ok,
    respuesta: res.ok
      ? res.text.slice(0, 500)
      : formatDuxItemsV2Error(res.status, res.text),
  };
}

/**
 * Ajuste de stock: GET ficha → pausa rate limit → PUT con stock del depósito actualizado.
 * El resto de la ficha se reenvía para no vaciar precios/depósitos.
 */
export async function putAjusteStockItemV2(input: {
  codItem: string;
  stock: number;
  idDeposito: number;
  idPersonal: number;
  sucursalesHabilitadas: { id_sucursal: number }[];
}): Promise<DuxPutItemResult> {
  const got = await getItemV2PorCod(input.codItem);
  if (!got.ok) {
    return {
      httpStatus: got.httpStatus,
      ok: false,
      respuesta: got.respuesta,
    };
  }
  const body = armarBodyGuardarItemV2({
    ficha: got.ficha,
    idPersonal: input.idPersonal,
    idDeposito: input.idDeposito,
    stock: input.stock,
    sucursalesHabilitadas: input.sucursalesHabilitadas,
  });
  await sleep(DUX_API_BATCH_INTERVAL_MS);
  return putItemV2(input.codItem, body);
}
