import { DUX_BASE_URL } from "@/lib/duxApi";
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
  idDetItem: number | null;
  talle: string | null;
  color: string | null;
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
  tipoProducto: string | null;
  idUnidadMedida: number | null;
  idMoneda: number | null;
};

/** Body PUT: snake_case del contrato [actualizar_item](https://developers.duxsoftware.com.ar/reference/actualizar_item). */
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
  stock: Array<{
    id_deposito: number;
    ctd_disponible: number;
  }>;
};

/** Sucursales DUX de la empresa (PUT ítem: siempre todas). Override: `DUX_SUCURSALES_HABILITADAS=1,2,4`. */
const DUX_SUCURSALES_HABILITADAS_DEFAULT = [1, 2, 4] as const;

export function getDuxSucursalesHabilitadasPut(): { id_sucursal: number }[] {
  const raw = process.env.DUX_SUCURSALES_HABILITADAS?.trim();
  if (raw) {
    const ids: number[] = [];
    const seen = new Set<number>();
    for (const part of raw.split(/[,\s]+/)) {
      const n = Number(part);
      if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
      seen.add(n);
      ids.push(n);
    }
    if (ids.length > 0) return ids.map((id_sucursal) => ({ id_sucursal }));
  }
  return DUX_SUCURSALES_HABILITADAS_DEFAULT.map((id_sucursal) => ({
    id_sucursal,
  }));
}

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
        id_solicitud?: string;
        detalle?: Array<{ campo?: string; problema?: string }>;
      };
    };
    const msg = parsed.error?.mensaje?.trim() ?? "";
    const idSolicitud = parsed.error?.id_solicitud?.trim() ?? "";
    const detalle = parsed.error?.detalle ?? [];
    const campos = detalle
      .map((d) => {
        const campo = d.campo?.trim() ?? "";
        const problema = d.problema?.trim() ?? "";
        if (!campo && !problema) return "";
        return campo && problema ? `${campo}: ${problema}` : campo || problema;
      })
      .filter((s) => s.length > 0);
    const sufijoId = idSolicitud ? ` [${idSolicitud}]` : "";
    if (msg && campos.length > 0) {
      return `${msg} (${campos.slice(0, 6).join("; ")})${sufijoId}`.slice(0, 500);
    }
    if (msg) return `${msg}${sufijoId}`.slice(0, 500);
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
    const id =
      asFiniteNumber(pick(row, ["id_deposito", "idDeposito"])) ??
      asFiniteNumber(pick(row, ["id"]));
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
      idDetItem: asFiniteNumber(pick(row, ["id_det_item", "idDetItem"])),
      talle: asString(pick(row, ["talle"])),
      color: asString(pick(row, ["color"])),
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

function itemsArrayDesdeLista(parsed: unknown): unknown[] {
  if (!isRecord(parsed)) return [];
  if (Array.isArray(parsed.results)) return parsed.results;
  if (Array.isArray(parsed.datos)) return parsed.datos;
  if (Array.isArray(parsed.data)) return parsed.data;
  return [];
}

function itemTieneVariantes(stock: DuxV2ItemStock[]): boolean {
  return stock.some(
    (row) => row.talle != null || row.color != null || row.idDetItem != null
  );
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
    tipoProducto: asString(pick(raw, ["tipo_producto", "tipoProducto"])),
    idUnidadMedida: asFiniteNumber(
      pick(raw, ["id_unidad_medida", "idUnidadMedida"])
    ),
    idMoneda: asFiniteNumber(pick(raw, ["id_moneda", "idMoneda"])),
  };
}

type GetItemResult =
  | { ok: true; ficha: DuxV2ItemFicha }
  | { ok: false; httpStatus: number; respuesta: string };

function fichaDesdeRespuestaGet(
  status: number,
  text: string,
  codItem: string
): GetItemResult {
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      httpStatus: status,
      respuesta: formatDuxItemsV2Error(status, text),
    };
  }
  let parsed: unknown = {};
  try {
    parsed = text.trim() ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      httpStatus: status,
      respuesta: "Respuesta GET DUX no es JSON.",
    };
  }
  const datos = itemsArrayDesdeLista(parsed);
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

/**
 * GET `/items?codigoItem=` — catálogo v1 (mismo que la sync). Auth **sin** Bearer.
 * `stock[].id` es el depósito. Contrato: https://duxsoftware.readme.io/reference/consultar-items-1
 */
export async function getItemV1PorCodigo(codItem: string): Promise<GetItemResult> {
  const token = getDuxApiToken();
  const url =
    `${DUX_BASE_URL}?codigoItem=${encodeURIComponent(codItem)}` +
    `&limit=1&offset=0`;
  const res = await duxItemsV2Fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: token,
    },
  });
  return fichaDesdeRespuestaGet(res.status, res.text, codItem);
}

/**
 * GET `/v2/items?cod_item=` — ficha v2 (no envía id_empresa).
 * Contrato: https://duxsoftware.readme.io/reference/listar_items
 */
export async function getItemV2PorCod(codItem: string): Promise<GetItemResult> {
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
  return fichaDesdeRespuestaGet(res.status, res.text, codItem);
}

function armarFilasStockPut(
  ficha: DuxV2ItemFicha,
  idDeposito: number,
  stockNuevo: number
): { id_deposito: number; ctd_disponible: number }[] {
  const seen = new Set<number>();
  const out: { id_deposito: number; ctd_disponible: number }[] = [];
  let matching = false;
  for (const row of ficha.stock) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const esDestino = row.id === idDeposito;
    if (esDestino) matching = true;
    out.push({
      id_deposito: row.id,
      ctd_disponible: esDestino ? stockNuevo : (row.stockDisponible ?? 0),
    });
  }
  if (!matching) {
    out.push({ id_deposito: idDeposito, ctd_disponible: stockNuevo });
  }
  return out;
}

export function armarBodyGuardarItemV2(input: {
  ficha: DuxV2ItemFicha;
  idPersonal: number;
  idDeposito: number;
  stock: number;
}): DuxV2GuardarItemRequest {
  const id_unidad_medida =
    input.ficha.idUnidadMedida != null && input.ficha.idUnidadMedida > 0
      ? input.ficha.idUnidadMedida
      : getDuxIdUnidadMedida();
  const id_moneda =
    input.ficha.idMoneda != null && input.ficha.idMoneda > 0
      ? input.ficha.idMoneda
      : getDuxIdMoneda();
  const tipo_producto = input.ficha.tipoProducto ?? getDuxTipoProducto();
  return {
    id_personal: input.idPersonal,
    tipo_producto,
    cod_item: input.ficha.codItem,
    item: input.ficha.item,
    id_moneda,
    porc_iva: input.ficha.porcIva,
    costo_compra: input.ficha.costo,
    id_unidad_medida,
    sucursales_habilitadas: getDuxSucursalesHabilitadasPut(),
    stock: armarFilasStockPut(input.ficha, input.idDeposito, input.stock),
  };
}

/**
 * PUT `/v2/items/{cod_item}?id_empresa=` — snake_case (contrato OpenAPI).
 * Contrato: https://developers.duxsoftware.com.ar/reference/actualizar_item
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
  if (!res.ok) {
    console.error(
      "[duxItemsV2][putItemV2]",
      res.status,
      {
        codItem,
        tipo_producto: body.tipo_producto,
        id_unidad_medida: body.id_unidad_medida,
        id_moneda: body.id_moneda,
        depositos: body.stock.map((s) => s.id_deposito),
      },
      res.text.slice(0, 400)
    );
  }
  return {
    httpStatus: res.status,
    ok: res.ok,
    respuesta: res.ok
      ? res.text.slice(0, 500)
      : formatDuxItemsV2Error(res.status, res.text),
  };
}

/**
 * Ajuste de stock: GET v1 (fallback v2) → pausa rate limit → PUT snake_case.
 * Copia todos los depósitos; solo cambia el de la sucursal.
 */
export async function putAjusteStockItemV2(input: {
  codItem: string;
  stock: number;
  idDeposito: number;
  idPersonal: number;
}): Promise<DuxPutItemResult> {
  let got = await getItemV1PorCodigo(input.codItem);
  if (!got.ok) {
    await sleep(DUX_API_BATCH_INTERVAL_MS);
    got = await getItemV2PorCod(input.codItem);
  }
  if (!got.ok) {
    return {
      httpStatus: got.httpStatus,
      ok: false,
      respuesta: got.respuesta,
    };
  }
  if (itemTieneVariantes(got.ficha.stock)) {
    return {
      httpStatus: 400,
      ok: false,
      respuesta:
        `Ítem ${input.codItem} tiene talle/color en DUX; el PUT de prueba solo cubre ítems SIMPLE.`,
    };
  }
  const body = armarBodyGuardarItemV2({
    ficha: got.ficha,
    idPersonal: input.idPersonal,
    idDeposito: input.idDeposito,
    stock: input.stock,
  });
  await sleep(DUX_API_BATCH_INTERVAL_MS);
  return putItemV2(input.codItem, body);
}
