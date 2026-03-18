import { NextResponse } from "next/server";
import { syncListaPrecioTiendaFromDux } from "@/services/syncListaPrecioTienda.service";
import {
  getSyncDuxStatusFromDb,
  setSyncDuxErrorInDb,
  setSyncDuxProgressInDb,
  setSyncDuxSuccessInDb,
  startSyncDuxInDb,
} from "@/lib/syncDuxStatusDb";

/** Evita ejecutar dos sincronizaciones a la vez (p. ej. doble clic). */
let syncInProgress = false;

/**
 * GET: Ejecuta la sincronización DUX -> lista_precios_tienda (bloqueante).
 * Para prueba: abre en el navegador o usa curl http://localhost:3000/api/sync-lista-precios-tienda
 */
export async function GET() {
  try {
    const result = await syncListaPrecioTiendaFromDux();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error en sync lista_precios_tienda:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST: Ejecuta la sincronización y responde cuando termina (bloqueante).
 * Compatible con serverless: la función no devuelve hasta que el sync termina o falla.
 * El cliente debe esperar con timeout largo (ej. 5 min).
 */
export async function POST() {
  const current = await getSyncDuxStatusFromDb();
  if (syncInProgress || current.running) {
    return NextResponse.json(
      { ok: false, error: "Sincronización ya en curso" },
      { status: 409 }
    );
  }
  syncInProgress = true;
  await startSyncDuxInDb();
  try {
    let finalProcessed = 0;
    let finalTotal = 0;
    const result = await syncListaPrecioTiendaFromDux({
      onProgress(processed, total, phase) {
        finalProcessed = processed;
        finalTotal = total;
        void setSyncDuxProgressInDb(processed, total, phase);
      },
    });
    await setSyncDuxSuccessInDb(finalProcessed, finalTotal);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setSyncDuxErrorInDb(message);
    console.error("Error en sync lista_precios_tienda:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    syncInProgress = false;
  }
}
