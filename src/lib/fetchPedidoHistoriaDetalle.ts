import type { ActionResult } from "@/lib/types";
import type { PedidoHistoriaDetalle } from "@/services/pedidosHistoria.service";

type DetalleJsonBody = Partial<{
  ok: boolean;
  data: PedidoHistoriaDetalle;
  error: string;
  supportId: string;
}>;

/** Carga el detalle vía `GET /api/pedidos-historia/[pedidoHistoriaId]/detalle` (sin Server Action). */
export async function fetchPedidoHistoriaDetalle(
  pedidoHistoriaId: string
): Promise<ActionResult<PedidoHistoriaDetalle>> {
  try {
    const res = await fetch(`/api/pedidos-historia/${encodeURIComponent(pedidoHistoriaId)}/detalle`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const supportHeader = res.headers.get("x-support-id");

    let parsedJson: unknown;
    try {
      parsedJson = await res.json();
    } catch {
      return {
        ok: false,
        error: supportHeader
          ? `Respuesta inválida del servidor (HTTP ${res.status}). Ref.: ${supportHeader}`
          : `Respuesta inválida del servidor (HTTP ${res.status}).`,
      };
    }

    const body = parsedJson as DetalleJsonBody;
    const baseError =
      typeof body.error === "string" ? body.error : "No se pudo cargar el detalle.";
    const supportFromBody =
      typeof body.supportId === "string" ? body.supportId : supportHeader ?? "";

    const appendSupport = supportFromBody !== "" ? `\n\nRef. soporte (logs Vercel): ${supportFromBody}` : "";

    if (typeof body.ok !== "boolean") {
      return {
        ok: false,
        error: baseError + appendSupport,
      };
    }

    if (!body.ok) {
      const err = `${baseError}${appendSupport}`;
      if (res.status === 403) return { ok: false, error: err };
      if (res.status === 400) return { ok: false, error: baseError };
      if (res.status >= 500) return { ok: false, error: err };
      return { ok: false, error: baseError };
    }

    if (!body.data) {
      return { ok: false, error: "Datos incompletos en la respuesta del servidor." };
    }

    return { ok: true, data: body.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Fallo de red al cargar el detalle: ${msg}`,
    };
  }
}
