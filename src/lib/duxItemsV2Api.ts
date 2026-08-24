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

/** Body PUT WSERP: camelCase (Jackson). Snake_case llega todo null. */
export type DuxV2GuardarItemRequest = {
  idPersonal: number;
  tipoProducto: string;
  codItem: string;
  item: string;
  idMoneda: number;
  porcIva: number;
  costoCompra: number;
  idUnidadMedida: number;
  sucursalesHabilitadas: { idSucursal: number }[];
  idRubro?: number;
  idSubRubro?: number;
  codMarca?: string;
  idProveedor?: number;
  codigoExterno?: string;
  ctdUnidadesPorBulto?: number;
  itemCodBarra?: { codBarra: string }[];
  precios?: {
    idListaPrecio: number;
    idMoneda: number;
    valor: number;
  }[];
  stock: {
    idDeposito: number;
    ctdDisponible: number;
  }[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function pick(
  obj: Record<string, unknown>,
  keys: string[]
): unknown {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
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
  return asFiniteNumber(pick(v, ["id", "idRubro", "idSubRubro"]));
}

function formatDuxItemsV2Error(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: {
        mensaje?: string;
        detalle?: Array<{ campo?: string; problema?: string }>;
      };
    };
    const msg = parsed.error?.mensaje?.trim() ?? "";
    const detalle = parsed.error?.detalle ?? [];
    const campos = detalle
      .map((d) => {
        const campo = d.campo?.trim() ?? "";
        const problema = d.problema?.trim() ?? "";
        if (!campo && !problema) return "";
        return campo && problema ? `${campo}: ${problema}` : campo || problema;
      })
      .filter((s) => s.length > 0);
    if (msg && campos.length > 0) {
      return `${msg} (${campos.slice(0, 6).join("; ")})`.slice(0, 500);
    }
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
    const id = asFiniteNumber(pick(row, ["id", "idDeposito", "id_deposito"]));
    if (id == null) continue;
    out.push({
      id,
      stockDisponible: asFiniteNumber(
        pick(row, [
          "stock_disponible",
          "stockDisponible",
          "ctd_disponible",
          "ctdDisponible",
        ])
      ),
    });
  }
  return out;
}

function parsePreciosArray(raw: unknown): DuxV2ItemPrecio[] {
  if (!Array.isArray(raw)) return [];
  const out: DuxV2ItemPrecio[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const id = asFiniteNumber(
      pick(row, ["id", "idListaPrecio", "id_lista_precio"])
    );
    const precio = asFiniteNumber(pick(row, ["precio", "valor"]));
    if (id == null || precio == null) continue;
    out.push({ id, precio });
  }
  return out;
}

function parseCodigosBarra(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string") {
      const s = asString(x);
      if (s) out.push(s);
      continue;
    }
    if (isRecord(x)) {
      const s = asString(pick(x, ["cod_barra", "codBarra"]));
      if (s) out.push(s);
    }
  }
  return out;
}

function parseFichaItemV2(raw: unknown): DuxV2ItemFicha | null {
  if (!isRecord(raw)) return null;
  const codItem = asString(pick(raw, ["cod_item", "codItem"]));
  const item = asString(raw.item);
  if (!codItem || !item) return null;
  const marca = isRecord(raw.marca) ? raw.marca : null;
  const proveedor = isRecord(raw.proveedor) ? raw.proveedor : null;
  return {
    codItem,
    item,
    porcIva: asFiniteNumber(pick(raw, ["porc_iva", "porcIva"])) ?? 0,
    costo:
      asFiniteNumber(pick(raw, ["costo", "costo_compra", "costoCompra"])) ?? 0,
    idRubro: nestedId(raw.rubro),
    idSubRubro: nestedId(pick(raw, ["sub_rubro", "subRubro"]) ?? null),
    codigoMarca: marca
      ? asString(pick(marca, ["codigo_marca", "codigoMarca", "cod_marca", "codMarca"]))
      : null,
    idProveedor: proveedor
      ? asFiniteNumber(pick(proveedor, ["id_proveedor", "idProveedor", "id"]))
      : null,
    codigoExterno: asString(
      pick(raw, ["codigo_externo", "codigoExterno"])
    ),
    ctdUnidadesPorBulto: asFiniteNumber(
      pick(raw, ["ctd_unidades_por_bulto", "ctdUnidadesPorBulto"])
    ),
    codigosBarra: parseCodigosBarra(
      pick(raw, ["codigos_barra", "codigosBarra"])
    ),
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
  const datos = isRecord(parsed)
    ? Array.isArray(parsed.datos)
      ? parsed.datos
      : Array.isArray(parsed.data)
        ? parsed.data
        : []
    : [];
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
  sucursalesHabilitadas: { idSucursal: number }[];
}): DuxV2GuardarItemRequest {
  const idMoneda = getDuxIdMoneda();
  const stockMap = new Map<number, number>();
  for (const s of input.ficha.stock) {
    stockMap.set(s.id, s.stockDisponible ?? 0);
  }
  stockMap.set(input.idDeposito, input.stock);

  const body: DuxV2GuardarItemRequest = {
    idPersonal: input.idPersonal,
    tipoProducto: getDuxTipoProducto(),
    codItem: input.ficha.codItem,
    item: input.ficha.item,
    idMoneda,
    porcIva: input.ficha.porcIva,
    costoCompra: input.ficha.costo,
    idUnidadMedida: getDuxIdUnidadMedida(),
    sucursalesHabilitadas: input.sucursalesHabilitadas,
    stock: [...stockMap.entries()].map(([idDeposito, ctdDisponible]) => ({
      idDeposito,
      ctdDisponible,
    })),
  };

  if (input.ficha.idRubro != null) body.idRubro = input.ficha.idRubro;
  if (input.ficha.idSubRubro != null) body.idSubRubro = input.ficha.idSubRubro;
  if (input.ficha.codigoMarca) body.codMarca = input.ficha.codigoMarca;
  if (input.ficha.idProveedor != null) body.idProveedor = input.ficha.idProveedor;
  if (input.ficha.codigoExterno) body.codigoExterno = input.ficha.codigoExterno;
  if (input.ficha.ctdUnidadesPorBulto != null) {
    body.ctdUnidadesPorBulto = input.ficha.ctdUnidadesPorBulto;
  }
  if (input.ficha.codigosBarra.length > 0) {
    body.itemCodBarra = input.ficha.codigosBarra.map((codBarra) => ({
      codBarra,
    }));
  }
  if (input.ficha.precios.length > 0) {
    body.precios = input.ficha.precios.map((p) => ({
      idListaPrecio: p.id,
      idMoneda,
      valor: p.precio,
    }));
  }
  return body;
}

/**
 * PUT `/v2/items/{cod_item}?id_empresa=` — ficha completa en camelCase (WSERP/Jackson).
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
 * Ajuste de stock: GET ficha → pausa rate limit → PUT camelCase con stock del depósito.
 */
export async function putAjusteStockItemV2(input: {
  codItem: string;
  stock: number;
  idDeposito: number;
  idPersonal: number;
  sucursalesHabilitadas: { idSucursal: number }[];
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
