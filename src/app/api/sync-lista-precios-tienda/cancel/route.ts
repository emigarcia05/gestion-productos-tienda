import { NextResponse } from "next/server";
import { guardTiendaListaPreciosSincronizar } from "@/lib/apiRouteAuth";
import { requestCancelListaPrecioTiendaSyncInDb } from "@/lib/syncDuxStatusDb";

/**
 * POST: solicita cancelación cooperativa de la sync lista precios tienda.
 * Pone `running = false` en BD; el worker aborta en el siguiente chequeo.
 * No actualiza `lastCompletedAt` (no cuenta como “Últ. Act.”).
 */
export async function POST() {
  const denied = await guardTiendaListaPreciosSincronizar();
  if (denied) return denied;
  const cancelled = await requestCancelListaPrecioTiendaSyncInDb();
  return NextResponse.json({ ok: true, cancelled });
}
