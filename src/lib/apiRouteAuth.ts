import { NextResponse } from "next/server";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

/** Lista tienda DUX: mismo gate que POST `/api/sync-lista-precios-tienda`. */
export async function guardTiendaListaPreciosSincronizar(): Promise<NextResponse | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return NextResponse.json({ ok: false, error: "Sin permisos para sincronizar." }, { status: 403 });
  }
  return null;
}

/** Sync comprobantes DUX / tesorería: lectura del estado igual que uso en sidebar financiero. */
export async function guardFinanzasLectura(): Promise<NextResponse | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return NextResponse.json({ ok: false, error: "Sin permisos para finanzas." }, { status: 403 });
  }
  return null;
}

/** Sync precios competencia (scraping) + polling de estado. */
export async function guardCompetenciaPreciosSyncEsEditor(): Promise<NextResponse | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.competenciaPrecios.editar)) {
    return NextResponse.json(
      { ok: false, error: "Sin permisos para sincronizar precios de competencia." },
      { status: 403 }
    );
  }
  if (!(await esEditor())) {
    return NextResponse.json({ ok: false, error: "Sin permisos de editor." }, { status: 403 });
  }
  return null;
}

/** Import lista precios por API + polling de estado. */
export async function guardListaPreciosImportarEsEditor(): Promise<NextResponse | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return NextResponse.json({ ok: false, error: "Sin permisos para importar lista de precios." }, { status: 403 });
  }
  if (!(await esEditor())) {
    return NextResponse.json({ ok: false, error: "Sin permisos de editor." }, { status: 403 });
  }
  return null;
}

/** Import estadísticas por producto (`est_por_prod`). */
export async function guardEstPorProdImportarEsEditor(): Promise<NextResponse | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    return NextResponse.json(
      { ok: false, error: "Sin permisos para estadísticas de productos." },
      { status: 403 }
    );
  }
  if (!(await esEditor())) {
    return NextResponse.json(
      { ok: false, error: "Solo el modo editor puede importar estadísticas." },
      { status: 403 }
    );
  }
  return null;
}
