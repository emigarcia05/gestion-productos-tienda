import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardCompetenciaPreciosSyncEsEditor } from "@/lib/apiRouteAuth";
import { syncCompetenciaPreciosBodySchema } from "@/lib/validations/competenciaPrecios";
import { prisma } from "@/lib/prisma";
import {
  syncCompetenciaPrecios,
  SyncCompetenciaPreciosCancelledError,
} from "@/services/syncCompetenciaPrecios.service";
import {
  setCompetenciaSyncErrorInDb,
  setCompetenciaSyncProgressInDb,
  setCompetenciaSyncResultInDb,
  startCompetenciaSyncInDb,
  getCompetenciaSyncProgressFromDb,
  clearCompetenciaSyncRunningStateInDb,
} from "@/lib/competenciaPreciosProgressDb";

export const maxDuration = 300;

let syncInProgress = false;

/**
 * POST: sincroniza precios de competencia (scraping) para prod_precios_tienda.
 * Body: { competenciaId } obligatorio; { codTienda? } opcional para un solo ítem.
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

  const competidor = await prisma.prodCompetencia.findUnique({
    where: { id: parsed.data.competenciaId },
    select: { id: true, nombre: true },
  });
  if (!competidor) {
    return NextResponse.json({ ok: false, error: "Competidor no encontrado." }, { status: 404 });
  }

  const whereVinculo = {
    competenciaId: parsed.data.competenciaId,
    urlProducto: { not: null },
    ...(parsed.data.codTienda ? { codTienda: parsed.data.codTienda } : {}),
  };
  const totalEnBd = await prisma.prodPrecioCompetencia.count({ where: whereVinculo });
  if (totalEnBd === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No hay productos con URL cargada para este competidor. Asigná URLs antes de comparar.",
      },
      { status: 400 }
    );
  }
  const limite = parsed.data.limiteProductos;
  const totalPairs =
    limite != null && limite > 0 ? Math.min(totalEnBd, limite) : totalEnBd;

  syncInProgress = true;
  await startCompetenciaSyncInDb(totalPairs);

  try {
    const result = await syncCompetenciaPrecios({
      codTienda: parsed.data.codTienda,
      competenciaId: parsed.data.competenciaId,
      limiteProductos: parsed.data.limiteProductos,
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
    return NextResponse.json({
      ok: true,
      competenciaId: competidor.id,
      competenciaNombre: competidor.nombre,
      ...result,
    });
  } catch (e) {
    if (e instanceof SyncCompetenciaPreciosCancelledError) {
      await clearCompetenciaSyncRunningStateInDb();
      return NextResponse.json(
        { ok: false, cancelled: true, error: e.message },
        { status: 200 }
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    await setCompetenciaSyncErrorInDb(message);
    console.error("Error sync competencia precios:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    syncInProgress = false;
  }
}
