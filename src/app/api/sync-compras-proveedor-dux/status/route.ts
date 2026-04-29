import { NextResponse } from "next/server";
import { getSyncComprasProveedorDuxStatusFromDb } from "@/lib/syncComprasProveedorDuxStatusDb";

/**
 * GET: estado de la sincronización de comprobantes de compra desde DUX (polling en sidebar / Tesorería).
 * Misma tabla `sync_dux_status` que lista tienda, fila `compras-proveedor-dux`.
 */
export async function GET() {
  const progress = await getSyncComprasProveedorDuxStatusFromDb();
  return NextResponse.json({
    ...progress,
    lastCompletedAt: progress.lastCompletedAt?.toISOString() ?? null,
  });
}
