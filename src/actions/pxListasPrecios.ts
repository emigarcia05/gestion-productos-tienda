"use server";

import { revalidatePath } from "next/cache";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { guardarPxListaPrecioEdicionSchema } from "@/lib/validations/pxListasPrecios";
import { getPxListasPreciosPageDataFromDb } from "@/services/pxListasPreciosPage.service";
import { guardarPrecioListaEdicion } from "@/services/pxListasPreciosEdicion.service";

const PX_LISTAS_PATHS = [
  "/gestion-productos/tienda/px-listas",
  "/tienda/px-listas",
] as const;

function revalidatePxListasPaths() {
  for (const p of PX_LISTAS_PATHS) {
    revalidatePath(p);
  }
}

/** Listado paginado **Px Listas** (precios por lista DUX + edición manual). */
export async function getPxListasPreciosPageData(params: {
  q?: string;
  rubro?: string;
  marca?: string;
  subRubro?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    const vacio = await getPxListasPreciosPageDataFromDb({});
    return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  }
  return getPxListasPreciosPageDataFromDb(params);
}

/** Persiste override de precio (o lo elimina con `precio: null`). */
export async function guardarPxListaPrecioEdicionAction(
  raw: unknown
): Promise<ActionResult<{ precio: number | null; margenPct: number | null }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }

  const parsed = guardarPxListaPrecioEdicionSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(msg).flat()[0] ?? "Datos de precio inválidos.";
    return { ok: false, error: first };
  }

  try {
    const { codTienda, idLista, precio } = parsed.data;
    const res = await guardarPrecioListaEdicion(codTienda, idLista, precio);
    if (!res.success) {
      return { ok: false, error: res.error };
    }
    revalidatePxListasPaths();
    return {
      ok: true,
      data: {
        precio: res.data.precio,
        margenPct: res.data.margenPct,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el precio.",
    };
  }
}
