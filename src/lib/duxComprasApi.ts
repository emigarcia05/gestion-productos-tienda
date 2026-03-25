export const DUX_COMPRAS_BASE_URL = "https://erp.duxsoftware.com.ar/WSERP/rest/services/compras";

export interface CompraDux {
  comprobante: string;
  total?: string;
  montoAplicado?: string;
  idSucursal?: string;
}

interface CompraDuxRaw {
  comprobante?: unknown;
  total?: unknown;
  monto_aplicado?: unknown;
  id_sucursal?: unknown;
}

interface ComprasApiResponseRaw {
  results?: unknown;
  paging?: unknown;
}

function isCompraDuxRaw(val: unknown): val is CompraDuxRaw {
  return val !== null && typeof val === "object";
}

function mapCompra(raw: unknown): CompraDux {
  if (!isCompraDuxRaw(raw)) {
    return { comprobante: "" };
  }
  return {
    comprobante: String(raw.comprobante ?? ""),
    total: raw.total != null ? String(raw.total) : undefined,
    montoAplicado: raw.monto_aplicado != null ? String(raw.monto_aplicado) : undefined,
    idSucursal: raw.id_sucursal != null ? String(raw.id_sucursal) : undefined,
  };
}

export function parseFechaDuxToQuery(fecha: string): string {
  // El backend ya valida el formato. Acá solo devolvemos el string tal cual para evitar “doble parseo”.
  return fecha;
}

export async function fetchComprasPage(params: {
  fechaDesde: string;
  fechaHasta: string;
  idEmpresa: number;
  /** Opcional: filtra por sucursal en DUX usando el parámetro `idSucursal` (extraído desde `sucursales.id_dux`). */
  idSucursal?: number;
  limit?: number;
}): Promise<CompraDux[]> {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");

  const { fechaDesde, fechaHasta, idEmpresa, idSucursal, limit = 1 } = params;

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: token,
  };

  // Ejemplo: fechaDesde=01%2F11%2F2023&fechaHasta=30%2F11%2F2023&idEmpresa=2482&limit=1
  const url =
    `${DUX_COMPRAS_BASE_URL}` +
    `?fechaDesde=${encodeURIComponent(parseFechaDuxToQuery(fechaDesde))}` +
    `&fechaHasta=${encodeURIComponent(parseFechaDuxToQuery(fechaHasta))}` +
    `&idEmpresa=${encodeURIComponent(String(idEmpresa))}` +
    (idSucursal != null
      ? `&idSucursal=${encodeURIComponent(String(idSucursal))}`
      : "") +
    `&limit=${encodeURIComponent(String(limit))}`;

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Error API DUX compras: ${res.status} ${res.statusText}. ${bodyText}`.trim());
  }

  const json: ComprasApiResponseRaw = (await res.json()) as ComprasApiResponseRaw;
  const rawResults: unknown[] = Array.isArray(json.results) ? json.results : [];
  return rawResults.map(mapCompra);
}

