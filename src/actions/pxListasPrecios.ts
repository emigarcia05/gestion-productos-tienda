"use server";

import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

import { revalidatePath } from "next/cache";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { guardarPxListaMargenEdicionSchema } from "@/lib/validations/pxListasPrecios";
import { getPxListasPreciosPageDataFromDb } from "@/services/pxListasPreciosPage.service";
import { guardarPrecioListaEdicionDesdeMargen } from "@/services/pxListasPrecioEdicion.service";
import {
  clavesDesdeGruposExportPxListas,
  listarExportPxListasMargenPorLista,
  type ExportPxListaMargenGrupo,
} from "@/services/exportPxListasMargen.service";
import { limpiarPreciosEdicionTrasActPx } from "@/services/pxListasPrecioEdicion.service";

const PX_LISTAS_PATHS = [
  GP_ROUTES.analisisPrecios.cxYPxTienda.pxListas,
  "/tienda/px-listas",
] as const;

function revalidatePxListasPaths() {
  for (const p of PX_LISTAS_PATHS) {
    revalidatePath(p);
  }
}

/** Listado paginado **Px Listas** (precios por lista DUX + margen manual). */
export async function getPxListasPreciosPageData(params: {
  q?: string;
  rubro?: string;
  marca?: string;
  subRubro?: string;
  actualizar?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    const vacio = await getPxListasPreciosPageDataFromDb({});
    return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  }
  return getPxListasPreciosPageDataFromDb(params);
}

/** Persiste PX staging en `prod_tienda_precios_edicion` desde margen % (o elimina con `margenManual: null`). */
export async function guardarPxListaMargenEdicionAction(
  raw: unknown
): Promise<
  ActionResult<{
    margenManual: number | null;
    pxEdicion: number | null;
    pxEfectivo: number | null;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }

  const parsed = guardarPxListaMargenEdicionSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(msg).flat()[0] ?? "Datos de margen inválidos.";
    return { ok: false, error: first };
  }

  try {
    const { codTienda, idLista, margenManual } = parsed.data;
    const res = await guardarPrecioListaEdicionDesdeMargen(
      codTienda,
      idLista,
      margenManual
    );
    if (!res.success) {
      return { ok: false, error: res.error };
    }
    revalidatePxListasPaths();
    return {
      ok: true,
      data: {
        margenManual: res.data.margenManual,
        pxEdicion: res.data.pxEdicion,
        pxEfectivo: res.data.pxEfectivo,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el margen.",
    };
  }
}

/** Excel por `nombre_lista` (CODIGO + PORC UTILIDAD) y limpieza de staging exportado. */
export async function exportarPxListasMargenAction(): Promise<
  ActionResult<{ grupos: ExportPxListaMargenGrupo[] }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const grupos = await listarExportPxListasMargenPorLista();
    const claves = clavesDesdeGruposExportPxListas(grupos);
    if (claves.length > 0) {
      await limpiarPreciosEdicionTrasActPx(claves);
      revalidatePxListasPaths();
    }
    return { ok: true, data: { grupos } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo generar la exportación.",
    };
  }
}
