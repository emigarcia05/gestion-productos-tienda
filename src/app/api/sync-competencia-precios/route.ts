import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardCompetenciaPreciosSyncEsEditor } from "@/lib/apiRouteAuth";
import { syncCompetenciaPreciosBodySchema } from "@/lib/validations/competenciaPrecios";
import { prisma } from "@/lib/prisma";
import { syncCompetenciaPrecios } from "@/services/syncCompetenciaPrecios.service";
import {
  setCompetenciaSyncErrorInDb,
  setCompetenciaSyncProgressInDb,
  setCompetenciaSyncResultInDb,
  startCompetenciaSyncInDb,
  getCompetenciaSyncProgressFromDb,
} from "@/lib/competenciaPreciosProgressDb";

export const maxDuration = 300;

let syncInProgress = false;

/**
 * POST: sincroniza precios de competencia (scraping) para prod_precios_tienda.
 * Body opcional: { codTienda?, competenciaId? } para acotar el alcance.
 */
export async function POST(request: Request) {
  const denied = await guardCompetenciaPreciosSyncEsEditor();
  if (denied) return denied;

  const current = await getCompetenciaSyncProgressFromDb();
  if (syncInProgress || current.running) {
    return NextResponse.json(
      { ok: false, error: "Sincronización de competencia ya en curso." },
      { status: 409 }
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido." }, { status: 400 });
  }

  const parsed = syncCompetenciaPreciosBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Parámetros inválidos." }, { status: 400 });
  }

  const competidores = await prisma.prodCompetencia.count({
    where: parsed.data.competenciaId ? { id: parsed.data.competenciaId } : undefined,
  });
  if (competidores === 0) {
    return NextResponse.json(
      { ok: false, error: "Registrá al menos un competidor antes de sincronizar." },
      { status: 400 }
    );
  }

  const totalProductos = await prisma.listaPrecioTienda.count({
    where: parsed.data.codTienda ? { codTienda: parsed.data.codTienda } : undefined,
  });
  const totalPairs = totalProductos * competidores;

  syncInProgress = true;
  await startCompetenciaSyncInDb(totalPairs);

  try {
    const result = await syncCompetenciaPrecios({
      codTienda: parsed.data.codTienda,
      competenciaId: parsed.data.competenciaId,
      onProgress(processed, total) {
        void setCompetenciaSyncProgressInDb(processed, total);
      },
    });
    await setCompetenciaSyncResultInDb({
      encontrados: result.encontrados,
      vacios: result.vacios,
      errores: result.errores,
    });
    revalidatePath("/proveedores/competencia-precios");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setCompetenciaSyncErrorInDb(message);
    console.error("Error sync competencia precios:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    syncInProgress = false;
  }
}
