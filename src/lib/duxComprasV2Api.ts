export const DUX_COMPRAS_V2_BASE_URL =
  "https://erp.duxsoftware.com.ar/WSERP/rest/services/v2/compras";

const DUX_ID_EMPRESA_COMPRAS_DEFAULT = 2482;

export function getDuxIdEmpresaCompras(): number {
  const raw = process.env.DUX_ID_EMPRESA_COMPRAS;
  const n = raw != null && raw !== "" ? Number(raw) : DUX_ID_EMPRESA_COMPRAS_DEFAULT;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("DUX_ID_EMPRESA_COMPRAS inválido o no configurado.");
  }
  return n;
}

export interface V2CompraProductoRequest {
  cod_item: string;
  ctd: number;
  precio_unitario: number;
  porc_descuento?: number;
  observaciones?: string;
}

export interface V2CrearCompraRequest {
  id_empresa: number;
  id_sucursal: number;
  fecha: string;
  tipo_comprobante: string;
  id_proveedor: number;
  nro_comprobante: string;
  fecha_imputacion_contable?: string;
  id_deposito?: number;
  productos?: V2CompraProductoRequest[];
}

export interface WserpCrearCompraResponse {
  id_compra?: number;
  nro_comprobante?: string;
  estado_recepcion?: string;
}

interface ApiResponseWserpCrearCompraResponse {
  datos?: WserpCrearCompraResponse;
  id_solicitud?: string;
}

interface ErrorBody {
  mensaje?: string;
  codigo?: string;
}

interface ErrorResponse {
  error?: ErrorBody;
}

function formatDuxApiError(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as ErrorResponse;
    const msg = parsed.error?.mensaje?.trim();
    if (msg) return `Error API DUX compras v2 (${status}): ${msg}`;
  } catch {
    // ignorar parse
  }
  const trimmed = bodyText.trim();
  if (trimmed) return `Error API DUX compras v2 (${status}): ${trimmed}`;
  return `Error API DUX compras v2: ${status}`;
}

/**
 * POST `/v2/compras` — registrar comprobante de compra e ingresar stock.
 * Auth Bearer (`DUX_API_TOKEN`). Contrato: [crear_compra](https://duxsoftware.readme.io/reference/crear_compra).
 */
export async function postCompraV2(
  body: V2CrearCompraRequest
): Promise<{ datos: WserpCrearCompraResponse; idSolicitud?: string }> {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");

  const res = await fetch(DUX_COMPRAS_V2_BASE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(formatDuxApiError(res.status, bodyText));
  }

  let json: ApiResponseWserpCrearCompraResponse = {};
  if (bodyText.trim()) {
    json = JSON.parse(bodyText) as ApiResponseWserpCrearCompraResponse;
  }

  return {
    datos: json.datos ?? {},
    idSolicitud: json.id_solicitud,
  };
}
