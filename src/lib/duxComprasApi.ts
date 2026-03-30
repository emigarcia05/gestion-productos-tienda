export const DUX_COMPRAS_BASE_URL = "https://erp.duxsoftware.com.ar/WSERP/rest/services/compras";

export interface CompraDux {
  comprobante: string;
  total?: string;
  montoAplicado?: string;
  /** Alias histórico en respuesta DUX (`id_sucursal`). */
  idSucursal?: string;
  /** Preferido para persistencia en `comprobantes_proveedor.id_sucursal_empresa`. */
  idSucursalEmpresa?: string;
  idProveedor?: string;
  fechaComp?: string;
  tipoComp?: string;
}

interface CompraDuxRaw {
  comprobante?: unknown;
  total?: unknown;
  monto_aplicado?: unknown;
  monto_pagado?: unknown;
  id_sucursal?: unknown;
  id_sucursal_empresa?: unknown;
  id_proveedor?: unknown;
  fecha_comp?: unknown;
  tipo_comp?: unknown;
  tipo_comprobante?: unknown;
}

interface ComprasApiResponseRaw {
  results?: unknown;
  paging?: unknown;
}

function isCompraDuxRaw(val: unknown): val is CompraDuxRaw {
  return val !== null && typeof val === "object";
}

export function mapCompra(raw: unknown): CompraDux {
  if (!isCompraDuxRaw(raw)) {
    return { comprobante: "" };
  }

  const idSucursalEmpresa =
    raw.id_sucursal_empresa != null
      ? String(raw.id_sucursal_empresa)
      : raw.id_sucursal != null
        ? String(raw.id_sucursal)
        : undefined;

  const idProveedor = raw.id_proveedor != null ? String(raw.id_proveedor) : undefined;

  const fechaComp = raw.fecha_comp != null ? String(raw.fecha_comp) : undefined;

  const tipoComp =
    raw.tipo_comp != null
      ? String(raw.tipo_comp)
      : raw.tipo_comprobante != null
        ? String(raw.tipo_comprobante)
        : undefined;

  const montoAplicado =
    raw.monto_aplicado != null
      ? String(raw.monto_aplicado)
      : raw.monto_pagado != null
        ? String(raw.monto_pagado)
        : undefined;

  return {
    comprobante: String(raw.comprobante ?? ""),
    total: raw.total != null ? String(raw.total) : undefined,
    montoAplicado,
    idSucursal: raw.id_sucursal != null ? String(raw.id_sucursal) : undefined,
    idSucursalEmpresa,
    idProveedor,
    fechaComp,
    tipoComp,
  };
}

export function parseFechaDuxToQuery(fecha: string): string {
  return fecha;
}

function duxComprasSyncLimit(): number {
  const raw = process.env.DUX_COMPRAS_SYNC_LIMIT;
  if (raw == null || raw === "") return 2000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50_000) : 2000;
}

function duxComprasSyncMaxPages(): number {
  const raw = process.env.DUX_COMPRAS_SYNC_MAX_PAGES;
  if (raw == null || raw === "") return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 1;
}

/**
 * Una petición a `/compras`. `offset` solo se envía si &gt; 0 (si la API lo ignora, no repetir páginas:
 * dejar `DUX_COMPRAS_SYNC_MAX_PAGES=1`).
 */
export async function fetchComprasPage(params: {
  fechaDesde: string;
  fechaHasta: string;
  idEmpresa: number;
  /** Filtro por sucursal DUX (`sucursales.id_dux`). */
  idSucursal?: number;
  limit?: number;
  offset?: number;
}): Promise<CompraDux[]> {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");

  const { fechaDesde, fechaHasta, idEmpresa, idSucursal, limit = 1, offset } = params;

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: token,
  };

  const url =
    `${DUX_COMPRAS_BASE_URL}` +
    `?fechaDesde=${encodeURIComponent(parseFechaDuxToQuery(fechaDesde))}` +
    `&fechaHasta=${encodeURIComponent(parseFechaDuxToQuery(fechaHasta))}` +
    `&idEmpresa=${encodeURIComponent(String(idEmpresa))}` +
    (idSucursal != null
      ? `&idSucursal=${encodeURIComponent(String(idSucursal))}`
      : "") +
    `&limit=${encodeURIComponent(String(limit))}` +
    (offset != null && offset > 0
      ? `&offset=${encodeURIComponent(String(offset))}`
      : "");

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Error API DUX compras: ${res.status} ${res.statusText}. ${bodyText}`.trim());
  }

  const json: ComprasApiResponseRaw = (await res.json()) as ComprasApiResponseRaw;
  const rawResults: unknown[] = Array.isArray(json.results) ? json.results : [];
  return rawResults.map(mapCompra);
}

/**
 * Acumula páginas hasta vacío, límite por página o `DUX_COMPRAS_SYNC_MAX_PAGES`.
 * Entre páginas no aplica delay (el servicio de sync debe espaciar llamadas por sucursal).
 */
export async function fetchComprasPagesAcumulado(params: {
  fechaDesde: string;
  fechaHasta: string;
  idEmpresa: number;
  idSucursal: number;
}): Promise<CompraDux[]> {
  const pageLimit = duxComprasSyncLimit();
  const maxPages = duxComprasSyncMaxPages();
  const all: CompraDux[] = [];

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageLimit;
    const batch = await fetchComprasPage({
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      idEmpresa: params.idEmpresa,
      idSucursal: params.idSucursal,
      limit: pageLimit,
      offset: offset > 0 ? offset : undefined,
    });
    all.push(...batch);
    if (batch.length === 0 || batch.length < pageLimit) break;
  }

  return all;
}
