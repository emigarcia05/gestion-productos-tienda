import { NextResponse } from "next/server";
import { syncListaPrecioTiendaFromDux } from "@/services/syncListaPrecioTienda.service";

/**
 * GET: Ejecuta la sincronización DUX -> lista_precios_tienda.
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
