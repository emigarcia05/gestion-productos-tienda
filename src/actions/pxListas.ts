"use server";

import { revalidatePath } from "next/cache";
import { getTiendaPageData } from "@/actions/tienda";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { DET_PRECIO_MANUAL } from "@/lib/pxListas";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";
import { z } from "zod";
import {
  guardarPxListaConfig,
  obtenerMapPxListaConfig,
} from "@/services/pxListasConfig.service";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";

const guardarPxListaSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  detPrecioSeleccion: z.union([z.literal(DET_PRECIO_MANUAL), z.string().min(1).max(128)]),
  pxListaManual: z.number().finite().nonnegative().nullable().optional(),
});

/** Listado paginado **Px Listas** con DET PRECIO, PX LISTA y MARCACION. */
export async function getPxListasPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
  proveedor?: string;
  vinculado?: string;
  pagina?: string;
}) {
  const data = await getTiendaPageData(params);
  const codTiendas = data.items.map((i) => i.codItem);
  const configMap = await obtenerMapPxListaConfig(codTiendas);
  const items = await buildPxListasItemsDesdeFilas(
    data.items.map((row) => ({
      codTienda: row.codItem,
      descripcion: row.descripcion,
      costoCompra: row.costo,
    })),
    configMap
  );
  return { ...data, items };
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
