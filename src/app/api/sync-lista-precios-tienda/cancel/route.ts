import { NextResponse } from "next/server";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { requestCancelListaPrecioTiendaSyncInDb } from "@/lib/syncDuxStatusDb";

/**
 * POST: solicita cancelación cooperativa de la sync lista precios tienda.
 * Pone `running = false` en BD; el worker aborta en el siguiente chequeo.
 * No actualiza `lastCompletedAt` (no cuenta como “Últ. Act.”).
 */
export async function POST() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return NextResponse.json({ ok: false, error: "Sin permisos para sincronizar." }, { status: 403 });
  }
  const cancelled = await requestCancelListaPrecioTiendaSyncInDb();
  return NextResponse.json({ ok: true, cancelled });
}
