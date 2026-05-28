import {
  PX_LISTA_SELECCION_PROM,
  calcMarcacionCxPxTienda,
  costoCxProdMostrado,
} from "@/lib/cxPxTienda";
import { prisma } from "@/lib/prisma";
import {
  buildItemsCxPxDesdeFilas,
  filaCxPxSelect,
  listarCompetenciasPxListaCtx,
} from "@/services/cxPxTiendaRows.service";
import {
  calcularPxPromedioCompetencia,
  pxListaMostradoParaSeleccion,
  pxListaTiendaDifiereDeCxPx,
} from "@/services/pxListaCxPxTienda.service";

export interface FilaExportPxListaCx {
  codigo: string;
  /** Columna Excel PORC UTILIDAD (= marcación Cx & Px, 2 decimales). */
  importe: number;
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Control de precios de venta: compara `px_lista_tienda` (DUX) con el valor mostrado en **PX LISTA**
 * de la grilla (`pxListaMostradoParaSeleccion`: competidor elegido → `prod_precios_competencia` /
 * sugerido; **PX. PROM.** → promedio competidores con precio).
 * Excel: CODIGO = `cod_tienda`, PORC UTILIDAD = marcación con ese px competencia y CX PROD.
 */
export async function listarFilasExportPxListaCxDiff(): Promise<FilaExportPxListaCx[]> {
  const competenciasPxLista = await listarCompetenciasPxListaCtx();

  const rows = await prisma.listaPrecioTienda.findMany({
    select: {
      ...filaCxPxSelect,
      pxListaTienda: true,
    },
    orderBy: { codTienda: "asc" },
  });

  const pxListaTiendaPorCodTienda = new Map(
    rows.map((r) => [r.codTienda, toNum(r.pxListaTienda)])
  );

  const items = await buildItemsCxPxDesdeFilas(rows, competenciasPxLista);

  const filas: FilaExportPxListaCx[] = [];
  for (const item of items) {
    if (item.opcionesPxLista.length === 0) continue;

    if (item.seleccionPxLista === PX_LISTA_SELECCION_PROM) {
      const prom = calcularPxPromedioCompetencia(item.opcionesPxLista);
      if (prom == null || prom <= 0) continue;
    } else {
      const op = item.opcionesPxLista.find((o) => o.competenciaId === item.seleccionPxLista);
      if (!op || op.px == null || op.px <= 0) continue;
    }

    const pxCompetencia = pxListaMostradoParaSeleccion(
      item.seleccionPxLista,
      item.opcionesPxLista,
      item.pxListaTiendaDux
    );
    const pxDux = pxListaTiendaPorCodTienda.get(item.codTienda) ?? 0;
    if (!pxListaTiendaDifiereDeCxPx(pxDux, pxCompetencia)) continue;

    const marcacion = calcMarcacionCxPxTienda(pxCompetencia, costoCxProdMostrado(item));
    if (marcacion == null) continue;

    filas.push({
      codigo: item.codTienda,
      importe: marcacion,
    });
  }
  return filas;
}
