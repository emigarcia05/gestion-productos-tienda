import { NextResponse } from "next/server";
import { syncListaPrecioTiendaFromDux } from "@/services/syncListaPrecioTienda.service";
import { runSyncWithProgress, getSyncProgress } from "@/lib/syncProgressStore";

/**
 * GET: Ejecuta la sincronización DUX -> lista_precios_tienda (bloqueante).
 * Para prueba: abre en el navegador o usa curl http://localhost:3000/api/sync-lista-precios-tienda
 * Los logs de progreso aparecen en la consola del servidor (terminal donde corre next).
 */
export async function GET() {
  try {
    const result = await syncListaPrecioTiendaFromDux();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error en sync lista_precios_tienda:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST: Inicia la sincronización en segundo plano. Responde 202 de inmediato.
 * El cliente debe hacer polling a GET .../status para obtener progreso y resultado.
 */
export async function POST() {
  const progress = getSyncProgress();
  if (progress.running) {
    return NextResponse.json(
      { ok: false, error: "Sincronización ya en curso" },
      { status: 409 }
    );
  }
  runSyncWithProgress();
  return NextResponse.json({ ok: true, message: "Sincronización iniciada" }, { status: 202 });
}
