"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { DET_PRECIO_MANUAL } from "@/lib/pxListas";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";
import { z } from "zod";
import {
  guardarPxListaConfig,
} from "@/services/pxListasConfig.service";
import { getPxListasPageDataFromDb } from "@/services/pxListasPage.service";
import { listarFilasExportPxDiff } from "@/services/exportPxDiff.service";
import type { FilaExportPx } from "@/services/exportPxDiff.service";

const guardarPxListaSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  detPrecioSeleccion: z.union([z.literal(DET_PRECIO_MANUAL), z.string().min(1).max(128)]),
  pxListaManual: z.number().finite().nonnegative().nullable().optional(),
});

/** Listado paginado **Px Listas** con DET PRECIO, PX LISTA y MARCACION. */
export async function getPxListasPageData(params: {
  q?: string;
  rubro?: string;
  marca?: string;
  detPrecio?: string;
  ordenMarcacion?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    const vacio = await getPxListasPageDataFromDb({});
    return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  }
  return getPxListasPageDataFromDb(params);
}

export async function guardarPxListaTiendaAction(raw: unknown): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = guardarPxListaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { codTienda, detPrecioSeleccion, pxListaManual } = parsed.data;
  const res = await guardarPxListaConfig(
    codTienda,
    detPrecioSeleccion,
    detPrecioSeleccion === DET_PRECIO_MANUAL ? (pxListaManual ?? null) : null
  );
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/gestion-productos/tienda/cx-px-tienda");
  revalidatePath("/tienda/cx-px");
  return { ok: true, data: undefined };
}

/** Excel CODIGO + PORC UTILIDAD: marcación DUX ≠ marcación persistida en Px Listas. */
export async function exportarPxDiffAction(): Promise<
  ActionResult<{ filas: FilaExportPx[] }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const filas = await listarFilasExportPxDiff();
    return { ok: true, data: { filas } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo generar la exportación.",
    };
  }
}
