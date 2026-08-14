"use server";

import { mensajeErrorAction, requireEditorConPermiso } from "@/lib/actionHelpers";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { getPxListasPageParamsSchema } from "@/lib/validations/pxListas";
import { getPxListasPageDataFromDb } from "@/services/pxListasPage.service";
import type { InformeAumentosPxExport } from "@/lib/exportPxDiffTypes";
import { obtenerInformeAumentosCostos } from "@/services/exportResumenAumentos.service";

async function vacioPxListas() {
  const vacio = await getPxListasPageDataFromDb({});
  return { ...vacio, items: [], total: 0, totalPaginas: 1 };
}

/** Listado paginado **Px Competencia** (comparación precios vs competidores). */
export async function getPxListasPageData(params: unknown) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return vacioPxListas();
  }
  const parsed = getPxListasPageParamsSchema.safeParse(params);
  if (!parsed.success) {
    return vacioPxListas();
  }
  try {
    return await getPxListasPageDataFromDb(parsed.data);
  } catch (e) {
    console.error("[getPxListasPageData]", e);
    return vacioPxListas();
  }
}

/** Informe de aumentos (resumen + detalle por producto; PDF en cliente; **Cx Compra**). */
export async function exportarResumenAumentosPxAction(): Promise<
  ActionResult<{ informeAumentos: InformeAumentosPxExport }>
> {
  const gate = await requireEditorConPermiso(
    PERMISOS.cxPxTienda.acceso,
    "Sin acceso."
  );
  if (gate) return gate;
  try {
    const informeAumentos = await obtenerInformeAumentosCostos();
    return { ok: true, data: { informeAumentos } };
  } catch (e) {
    return {
      ok: false,
      error: mensajeErrorAction(e, "No se pudo generar el resumen de aumentos."),
    };
  }
}
