import { getDuxIdEmpresaCompras } from "@/lib/duxComprasV2Api";

export const DUX_ITEMS_V2_BASE_URL =
  "https://erp.duxsoftware.com.ar/WSERP/rest/services/v2/items";

const FETCH_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.DUX_FETCH_TIMEOUT_MS) || 30_000
);

export type DuxPutAjusteStockBody = {
  cod_tienda: string;
  stock: number;
  deposito: number;
  usuario: number;
};

export type DuxPutItemResult = {
  httpStatus: number;
  ok: boolean;
  respuesta: string;
};

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

/**
 * PUT `/v2/items/{cod_item}?id_empresa=` — prueba de ajuste.
 * Body mínimo (mismo criterio que el Excel): cod_tienda, stock, deposito, usuario.
 * Contrato: https://duxsoftware.readme.io/reference/actualizar_item
 */
export async function putAjusteStockItemV2(
  body: DuxPutAjusteStockBody
): Promise<DuxPutItemResult> {
  const token = process.env.DUX_API_TOKEN;
  if (!token) throw new Error("DUX_API_TOKEN no configurado.");

  const idEmpresa = getDuxIdEmpresaCompras();
  const url =
    `${DUX_ITEMS_V2_BASE_URL}/${encodeURIComponent(body.cod_tienda)}` +
    `?id_empresa=${encodeURIComponent(String(idEmpresa))}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const respuesta = await res.text().catch(() => "");
    return {
      httpStatus: res.status,
      ok: res.ok,
      respuesta: res.ok
        ? respuesta.slice(0, 500)
        : formatDuxItemsV2Error(res.status, respuesta),
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("La petición a DUX no respondió a tiempo.");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
