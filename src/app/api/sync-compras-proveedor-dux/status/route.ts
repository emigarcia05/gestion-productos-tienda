import { NextResponse } from "next/server";
import { guardFinanzasLectura } from "@/lib/apiRouteAuth";
import { getSyncComprasProveedorDuxStatusFromDb } from "@/lib/syncComprasProveedorDuxStatusDb";
import {
  estimateSyncComprasRemainingSeconds,
  syncComprasSecondsPerSucursalEstimate,
} from "@/services/comprobantesProveedorDuxSync.service";

/**
 * GET: estado de la sincronización de comprobantes de compra desde DUX (polling en sidebar / Tesorería).
 * Misma tabla `sync_dux_status` que lista tienda, fila `compras-proveedor-dux`.
 */
export async function GET() {
  const denied = await guardFinanzasLectura();
  if (denied) return denied;

  const progress = await getSyncComprasProveedorDuxStatusFromDb();
  const remainingSeconds = estimateSyncComprasRemainingSeconds(
    progress.processed,
    progress.total,
    progress.running
  );
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return NextResponse.json({
    ...progress,
    lastCompletedAt: progress.lastCompletedAt?.toISOString() ?? null,
    secondsPerSucursal: syncComprasSecondsPerSucursalEstimate(),
    remainingSeconds: Math.round(remainingSeconds),
    remainingMinutes,
  });
}
