import { NextResponse } from "next/server";
import { syncListaPrecioTiendaFromDux } from "@/services/syncListaPrecioTienda.service";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  clearListaPrecioTiendaSyncRunningStateInDb,
  getSyncDuxStatusFromDb,
  setSyncDuxErrorInDb,
  setSyncDuxProgressInDb,
  setSyncDuxSuccessInDb,
  startSyncDuxInDb,
} from "@/lib/syncDuxStatusDb";
import { SyncListaPrecioTiendaCancelledError } from "@/services/syncListaPrecioTienda.service";

/** Sync DUX puede demorar varios minutos (rate limit + persistencia por chunks). */
export const maxDuration = 300;

/** Evita ejecutar dos sincronizaciones a la vez (p. ej. doble clic). */
let syncInProgress = false;

async function ejecutarSyncListaPrecioTienda() {
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
      async onProgress(processed, total, phase) {
        finalProcessed = processed;
        finalTotal = total;
        await setSyncDuxProgressInDb(processed, total, phase);
      },
    });
    await setSyncDuxSuccessInDb(finalProcessed, finalTotal);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof SyncListaPrecioTiendaCancelledError) {
      await clearListaPrecioTiendaSyncRunningStateInDb();
      return NextResponse.json(
        { ok: false, cancelled: true, error: e.message },
        { status: 200 }
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    await setSyncDuxErrorInDb(message);
    console.error("Error en sync prod_tienda:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    syncInProgress = false;
  }
}

/**
 * GET: Ejecuta la sincronización DUX -> prod_tienda (bloqueante, con progreso en BD).
 * Para prueba: abre en el navegador o usa curl http://localhost:3000/api/sync-lista-precios-tienda
 */
export async function GET() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return NextResponse.json({ ok: false, error: "Sin permisos para sincronizar." }, { status: 403 });
  }
  return ejecutarSyncListaPrecioTienda();
}

/**
 * POST: Ejecuta la sincronización y responde cuando termina (bloqueante).
 * Compatible con serverless: la función no devuelve hasta que el sync termina o falla.
 */
export async function POST() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return NextResponse.json({ ok: false, error: "Sin permisos para sincronizar." }, { status: 403 });
  }
  return ejecutarSyncListaPrecioTienda();
}
