import { DUX_BASE_URL, mapItem } from "@/lib/duxApi";
import { getDuxIdEmpresaCompras } from "@/lib/duxComprasV2Api";

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

export type DuxStockDepositoLeido = {
  ctdDisponible: number | null;
  stockReal: number;
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
  stock?: Array<{
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

function getDuxPorcIva(): number {
  const n = Number(process.env.DUX_PORC_IVA ?? "21");
  return Number.isFinite(n) && n >= 0 ? n : 21;
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

/**
 * GET v1 `/items?codigoItem=` (misma auth que la sync: token sin Bearer).
 * Lee el depósito pedido para verificar si el PUT impactó.
 */
export async function getStockDepositoItemV1(
  codItem: string,
  idDeposito: number
): Promise<DuxStockDepositoLeido | null> {
  const token = getDuxApiToken();
  const url =
    `${DUX_BASE_URL}?codigoItem=${encodeURIComponent(codItem)}` +
    `&idDeposito=${encodeURIComponent(String(idDeposito))}` +
    `&limit=1&offset=0`;
  const res = await duxItemsV2Fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: token,
    },
  });
  if (!res.ok) {
    console.error(
      "[duxItemsV2][getStockDepositoItemV1]",
      res.status,
      codItem,
      idDeposito,
      res.text.slice(0, 400)
    );
    return null;
  }
  let parsed: unknown = {};
  try {
    parsed = res.text.trim() ? JSON.parse(res.text) : {};
  } catch {
    return null;
  }
  const record =
    parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  const rawResults: unknown[] = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.datos)
      ? record.datos
      : [];
  if (rawResults.length === 0) return null;
  const item = mapItem(rawResults[0]);
  const row = item.stocks.find((s) => s.idDeposito === idDeposito);
  if (!row) {
    return { ctdDisponible: null, stockReal: 0 };
  }
  return { ctdDisponible: row.ctdDisponible, stockReal: row.stockReal };
}

function parseItemV1DesdeTexto(text: string): ReturnType<typeof mapItem> | null {
  let parsed: unknown = {};
  try {
    parsed = text.trim() ? JSON.parse(text) : {};
  } catch {
    return null;
  }
  const record =
    parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  const rawResults: unknown[] = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.datos)
      ? record.datos
      : [];
  if (rawResults.length === 0) return null;
  return mapItem(rawResults[0]);
}

/** GET v1 `/items?codigoItem=` — lee `costo` para verificar PUT de Cx Compra. */
export async function getCostoItemV1(codItem: string): Promise<number | null> {
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
  if (!res.ok) {
    console.error(
      "[duxItemsV2][getCostoItemV1]",
      res.status,
      codItem,
      res.text.slice(0, 400)
    );
    return null;
  }
  const item = parseItemV1DesdeTexto(res.text);
  if (!item || item.codItem === "") return null;
  return item.costo;
}

function truncarItemDux(nombre: string): string {
  const t = nombre.trim();
  return t.length <= 250 ? t : t.slice(0, 250);
}

/** Body PUT snake_case desde tablas locales (sin GET a DUX). */
export function armarBodyGuardarItemV2(input: {
  codItem: string;
  item: string;
  costoCompra: number;
  idPersonal: number;
  idDeposito: number;
  stock: number;
}): DuxV2GuardarItemRequest {
  return {
    id_personal: input.idPersonal,
    tipo_producto: getDuxTipoProducto(),
    cod_item: input.codItem,
    item: truncarItemDux(input.item),
    id_moneda: getDuxIdMoneda(),
    porc_iva: getDuxPorcIva(),
    costo_compra: input.costoCompra,
    id_unidad_medida: getDuxIdUnidadMedida(),
    sucursales_habilitadas: getDuxSucursalesHabilitadasPut(),
    stock: [
      { id_deposito: input.idDeposito, ctd_disponible: input.stock },
    ],
  };
}

/** PUT de ficha para Cx Compra: `costo_compra` nuevo, sin `stock[]` (no toca inventario). */
export function armarBodyGuardarItemV2CostoCx(input: {
  codItem: string;
  item: string;
  costoCompra: number;
  idPersonal: number;
}): DuxV2GuardarItemRequest {
  return {
    id_personal: input.idPersonal,
    tipo_producto: getDuxTipoProducto(),
    cod_item: input.codItem,
    item: truncarItemDux(input.item),
    id_moneda: getDuxIdMoneda(),
    porc_iva: getDuxPorcIva(),
    costo_compra: input.costoCompra,
    id_unidad_medida: getDuxIdUnidadMedida(),
    sucursales_habilitadas: getDuxSucursalesHabilitadasPut(),
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
  console.info("[duxItemsV2][putItemV2]", res.status, {
    url,
    costo_compra: body.costo_compra,
    stock: body.stock ?? [],
    id_personal: body.id_personal,
    respuesta: res.text.slice(0, 500),
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
        depositos: body.stock?.map((s) => s.id_deposito) ?? [],
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
 * PUT de ajuste: body armado en el servicio desde tablas locales (sin GET).
 */
export async function putAjusteStockItemV2(
  body: DuxV2GuardarItemRequest
): Promise<DuxPutItemResult> {
  return putItemV2(body.cod_item, body);
}
