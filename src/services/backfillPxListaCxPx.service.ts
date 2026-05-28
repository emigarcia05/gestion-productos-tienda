import { PX_LISTA_SELECCION_PROM } from "@/lib/cxPxTienda";
import { prisma } from "@/lib/prisma";
import {
  buildItemsCxPxDesdeFilas,
  filaCxPxSelect,
  listarCompetenciasPxListaCtx,
} from "@/services/cxPxTiendaRows.service";
import {
  calcularPxPromedioCompetencia,
  guardarPxListaCxPxConfig,
  pxListaMostradoParaSeleccion,
} from "@/services/pxListaCxPxTienda.service";

const BATCH_SIZE = 200;

export type BackfillPxListaCxPxResult = {
  totalCandidatos: number;
  guardados: number;
  omitidos: number;
  errores: { codTienda: string; error: string }[];
};

export type BackfillPxListaCxPxOptions = {
  /** Solo filas sin persistencia previa (`cx_px_px_comp_ref` y `px_lista_cx_px` vacíos). */
  soloVacios?: boolean;
  dryRun?: boolean;
};

/**
 * Persiste en `prod_precios_tienda` la misma selección y precio que muestra la grilla Cx & Px
 * (`seleccionPxLista` + `pxListaMostradoParaSeleccion`).
 */
export async function backfillPxListaCxPxDesdeGrilla(
  options: BackfillPxListaCxPxOptions = {}
): Promise<BackfillPxListaCxPxResult> {
  const { soloVacios = true, dryRun = false } = options;
  const competencias = await listarCompetenciasPxListaCtx();

  const where = soloVacios
    ? { cxPxPxCompRef: null, pxListaCxPx: null }
    : {};

  const codTiendas = (
    await prisma.listaPrecioTienda.findMany({
      where,
      select: { codTienda: true },
      orderBy: { codTienda: "asc" },
    })
  ).map((r) => r.codTienda);

  const result: BackfillPxListaCxPxResult = {
    totalCandidatos: codTiendas.length,
    guardados: 0,
    omitidos: 0,
    errores: [],
  };

  for (let i = 0; i < codTiendas.length; i += BATCH_SIZE) {
    const lote = codTiendas.slice(i, i + BATCH_SIZE);
    const rows = await prisma.listaPrecioTienda.findMany({
      where: { codTienda: { in: lote } },
      select: filaCxPxSelect,
    });
    const items = await buildItemsCxPxDesdeFilas(rows, competencias);

    for (const item of items) {
      const { seleccionPxLista, opcionesPxLista, pxListaTiendaDux, codTienda } = item;

      if (seleccionPxLista === PX_LISTA_SELECCION_PROM) {
        const prom = calcularPxPromedioCompetencia(opcionesPxLista);
        if (prom == null || prom <= 0) {
          if (pxListaTiendaDux <= 0) {
            result.omitidos += 1;
            continue;
          }
        }
      } else {
        const op = opcionesPxLista.find((o) => o.competenciaId === seleccionPxLista);
        if (!op || op.px == null || op.px <= 0) {
          result.omitidos += 1;
          continue;
        }
      }

      const pxResuelto = pxListaMostradoParaSeleccion(
        seleccionPxLista,
        opcionesPxLista,
        pxListaTiendaDux
      );
      if (!Number.isFinite(pxResuelto) || pxResuelto <= 0) {
        result.omitidos += 1;
        continue;
      }

      if (dryRun) {
        result.guardados += 1;
        continue;
      }

      const res = await guardarPxListaCxPxConfig(
        codTienda,
        seleccionPxLista,
        Math.round(pxResuelto),
        competencias
      );
      if (res.success) {
        result.guardados += 1;
      } else {
        result.errores.push({ codTienda, error: res.error });
      }
    }
  }

  return result;
}
