/**
 * DUX API v1 — Modificar Precios/Productos.
 * POST `/item/nuevoItem` — [Modificar Precios/Productos](https://duxsoftware.readme.io/reference/modificar-preciosproductos-1)
 * GET `/obtenerEstadoItem` — [Consultar estado](https://duxsoftware.readme.io/reference/consultar-estado-modificacion-preciosproductos-1)
 *
 * Auth: header `Authorization` con token plano (`DUX_API_TOKEN`), igual que GET items.
 */

export const DUX_SERVICES_BASE_URL =
  "https://erp.duxsoftware.com.ar/WSERP/rest/services";

const FETCH_TIMEOUT_MS = Number(process.env.DUX_FETCH_TIMEOUT_MS) || 10_000;
const MAX_RETRIES_429 = 5;

/** Mínimo entre peticiones DUX (rate limit documentado: 1 req / 5 s). */
export const DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS = Math.max(
  5000,
  Number(process.env.DUX_SYNC_DELAY_MS) || 5000
);

/** Timestamp de la última petición POST/GET de este módulo (misma corrida). */
let lastDuxItemModificarRequestAt = 0;

/** Espera el intervalo mínimo entre peticiones consecutivas a DUX. */
export async function throttleDuxItemModificarRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastDuxItemModificarRequestAt;
  if (lastDuxItemModificarRequestAt > 0 && elapsed < DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS) {
    await sleepMs(DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS - elapsed);
  }
  lastDuxItemModificarRequestAt = Date.now();
}

export interface DuxModificarItemProductoRequest {
  cod_item: string;
  costo: number;
  /** Array vacío en UPDATE de solo costo (contrato probado con DUX). */
  precios: [];
}

export interface DuxModificarItemsRequest {
  productos: DuxModificarItemProductoRequest[];
}

/** Body por ítem alineado al curl DUX que funciona (solo costo + cod_item). */
export function buildDuxModificarItemCostoBody(
  codItem: string,
  costo: number
): DuxModificarItemProductoRequest {
  return {
    cod_item: codItem,
    costo,
    precios: [],
  };
}

interface PostModificarItemsResponse {
  message?: string;
}

interface GetEstadoItemResponse {
  estado?: string;
  errores?: string[];
}

function getDuxToken(): string {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");
  return token;
}

function formatDuxApiError(scope: string, status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { message?: string; error?: { mensaje?: string } };
    const msg = parsed.message?.trim() || parsed.error?.mensaje?.trim();
    if (msg) return `Error API DUX ${scope} (${status}): ${msg}`;
  } catch {
    // ignorar parse
  }
  const trimmed = bodyText.trim();
  if (trimmed) return `Error API DUX ${scope} (${status}): ${trimmed}`;
  return `Error API DUX ${scope}: ${status}`;
}

/** Extrae el id numérico de `"Peticion ingresada con exito, ID de proceso: 1"`. */
export function parseIdProcesoModificacionItems(message: string): number | null {
  const m = /ID de proceso:\s*(\d+)/i.exec(message);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * UPDATE de ítems existentes: `cod_item`, `costo` y `precios: []`.
 * `item` no es obligatorio en actualizaciones según documentación DUX.
 */
export async function postModificarItemsDux(
  body: DuxModificarItemsRequest
): Promise<{ message: string; idProceso: number | null }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    await throttleDuxItemModificarRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${DUX_SERVICES_BASE_URL}/item/nuevoItem`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: getDuxToken(),
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const bodyText = await res.text().catch(() => "");
    if (res.ok) {
      let json: PostModificarItemsResponse = {};
      if (bodyText.trim()) {
        json = JSON.parse(bodyText) as PostModificarItemsResponse;
      }
      const message = json.message?.trim() ?? "";
      return {
        message,
        idProceso: message ? parseIdProcesoModificacionItems(message) : null,
      };
    }

    lastError = new Error(formatDuxApiError("modificar items", res.status, bodyText));
    if (res.status === 429 && attempt < MAX_RETRIES_429) {
      await sleepMs(DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS);
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new Error("Error API DUX modificar items: desconocido");
}

export async function obtenerEstadoModificacionItemsDux(
  idProceso: number
): Promise<{ estado: string; errores: string[] }> {
  const url = `${DUX_SERVICES_BASE_URL}/obtenerEstadoItem?idProceso=${encodeURIComponent(String(idProceso))}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    await throttleDuxItemModificarRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: getDuxToken(),
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const bodyText = await res.text().catch(() => "");
    if (res.ok) {
      let json: GetEstadoItemResponse = {};
      if (bodyText.trim()) {
        json = JSON.parse(bodyText) as GetEstadoItemResponse;
      }

      return {
        estado: (json.estado ?? "").trim(),
        errores: Array.isArray(json.errores)
          ? json.errores.filter((e): e is string => typeof e === "string" && e.trim() !== "")
          : [],
      };
    }

    lastError = new Error(formatDuxApiError("estado modificación items", res.status, bodyText));
    if (res.status === 429 && attempt < MAX_RETRIES_429) {
      await sleepMs(DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS);
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new Error("Error API DUX estado modificación items: desconocido");
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
