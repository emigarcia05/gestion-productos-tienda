"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { getPxCompetenciaPageParamsSchema } from "@/lib/validations/pxCompetencia";
import { getPxCompetenciaPageDataFromDb } from "@/services/pxCompetenciaPage.service";
import type { InformeAumentosPxExport } from "@/lib/exportPxDiffTypes";
import { obtenerInformeAumentosCostos } from "@/services/exportResumenAumentos.service";

/** Listado paginado **Px Competencia** (comparación precios vs competidores). */
export async function getPxCompetenciaPageData(params: unknown) {
  const rol = await getRol();
  const vacio = await getPxCompetenciaPageDataFromDb({});
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  }
  const parsed = getPxCompetenciaPageParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  }
  return getPxCompetenciaPageDataFromDb(parsed.data);
}

/** Informe de aumentos (resumen + detalle por producto; PDF en cliente; **Cx Compra**). */
export async function exportarResumenAumentosPxAction(): Promise<
  ActionResult<{ informeAumentos: InformeAumentosPxExport }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const informeAumentos = await obtenerInformeAumentosCostos();
    return { ok: true, data: { informeAumentos } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo generar el resumen de aumentos.",
    };
  }
}
