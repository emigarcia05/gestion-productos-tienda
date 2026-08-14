import { NextResponse } from "next/server";
import { guardPedidosHistoriaLectura } from "@/lib/apiRouteAuth";
import { prismaCuidSchema } from "@/lib/validations/common";
import * as pedidosHistoriaService from "@/services/pedidosHistoria.service";

/**
 * Detalle del historial como JSON HTTP (alternativa al Flight de Server Actions).
 * Sirve cuando el cliente vería sólo digest/"Server Components render" en producción.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ pedidoHistoriaId: string }> }
) {
  try {
    const denied = await guardPedidosHistoriaLectura();
    if (denied) return denied;

    const { pedidoHistoriaId } = await ctx.params;
    const parsedId = prismaCuidSchema.safeParse(pedidoHistoriaId);
    if (!parsedId.success) {
      return NextResponse.json({ ok: false as const, error: "ID de pedido inválido." }, { status: 400 });
    }

    const res = await pedidosHistoriaService.getPedidoHistoriaDetalle({
      pedidoHistoriaId: parsedId.data,
    });
    if (!res.success) {
      return NextResponse.json({ ok: false as const, error: res.error });
    }

    const wired =
      pedidosHistoriaService.serializarPedidoHistoriaDetalleParaCliente(res.data);
    try {
      const data = JSON.parse(
        JSON.stringify(wired)
      ) as pedidosHistoriaService.PedidoHistoriaDetalle;
      return NextResponse.json({ ok: true as const, data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[api][pedidos-historia][detalle]", "serialización JSON:", msg);
      return NextResponse.json({
        ok: false as const,
        error: "No se pudo transmitir el detalle del pedido.",
      });
    }
  } catch (e) {
    const supportId = crypto.randomUUID();
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api][pedidos-historia][detalle]", supportId, msg);
    return NextResponse.json(
      {
        ok: false as const,
        error: `Error inesperado al cargar el detalle (ref. soporte ${supportId}).`,
        supportId,
      },
      {
        status: 500,
        headers: { "x-support-id": supportId },
      }
    );
  }
}
