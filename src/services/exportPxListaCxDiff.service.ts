import { prisma } from "@/lib/prisma";
import { marcacionCxPxDeItem, pxListaMostrado } from "@/lib/cxPxTienda";
import {
  buildItemsCxPxDesdeFilas,
  filaCxPxSelect,
  listarCompetenciasPxListaCtx,
} from "@/services/cxPxTiendaRows.service";
import { pxListaTiendaDifiereDeCxPx } from "@/services/pxListaCxPxTienda.service";

export interface FilaExportPxListaCx {
  codigo: string;
  /** Marcación de la grilla Cx & Px (% con 2 decimales, sin sufijo). */
  importe: number;
}

/**
 * Ítems donde `px_lista_tienda` (DUX) ≠ PX LISTA configurado en Cx & Px.
 * PORC UTILIDAD (Excel) = columna MARCACION de la misma pantalla.
 */
export async function listarFilasExportPxListaCxDiff(): Promise<FilaExportPxListaCx[]> {
  const [rows, competencias] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      select: filaCxPxSelect,
      orderBy: { codTienda: "asc" },
    }),
    listarCompetenciasPxListaCtx(),
  ]);

  const items = await buildItemsCxPxDesdeFilas(rows, competencias);
  const filas: FilaExportPxListaCx[] = [];

  for (const item of items) {
    const pxListaCxPx = pxListaMostrado(item);
    if (!pxListaTiendaDifiereDeCxPx(item.pxListaTiendaDux, pxListaCxPx)) continue;

    const marcacion = marcacionCxPxDeItem(item);
    if (marcacion == null) continue;

    filas.push({
      codigo: item.codTienda,
      importe: marcacion,
    });
  }

  return filas;
}
