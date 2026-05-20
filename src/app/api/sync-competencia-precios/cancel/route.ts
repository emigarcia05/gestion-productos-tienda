import { NextResponse } from "next/server";
import { guardCompetenciaPreciosSyncEsEditor } from "@/lib/apiRouteAuth";
import { requestCancelCompetenciaSyncInDb } from "@/lib/competenciaPreciosProgressDb";

/**
 * POST: cancelación cooperativa de la comparación en curso.
 * No actualiza ultima_comparacion_at del competidor.
 */
export async function POST() {
  const denied = await guardCompetenciaPreciosSyncEsEditor();
  if (denied) return denied;
  const cancelled = await requestCancelCompetenciaSyncInDb();
  return NextResponse.json({ ok: true, cancelled });
}
