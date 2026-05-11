import { NextResponse } from "next/server";
import { guardTiendaListaPreciosSincronizar } from "@/lib/apiRouteAuth";
import { getSyncDuxStatusFromDb } from "@/lib/syncDuxStatusDb";
import { SYNC_SECONDS_PER_BATCH } from "@/services/syncListaPrecioTienda.service";

const ITEMS_PER_BATCH = 50;

/**
 * GET: Devuelve el estado actual de la sincronización DUX (para polling desde el cliente).
 * Incluye secondsPerBatch para que el cliente calcule "faltan aprox. X minutos".
 */
export async function GET() {
  const denied = await guardTiendaListaPreciosSincronizar();
  if (denied) return denied;

  const progress = await getSyncDuxStatusFromDb();
  const remainingItems = Math.max(0, progress.total - progress.processed);
  const remainingBatches = Math.ceil(remainingItems / ITEMS_PER_BATCH);
  const remainingSeconds = progress.running
    ? remainingBatches * SYNC_SECONDS_PER_BATCH
    : 0;
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return NextResponse.json({
    ...progress,
    lastCompletedAt: progress.lastCompletedAt?.toISOString() ?? null,
    secondsPerBatch: SYNC_SECONDS_PER_BATCH,
    remainingSeconds: Math.round(remainingSeconds),
    remainingMinutes,
  });
}
