import type { ServiceResult } from "@/types";
import {
  buildDuxModificarItemCostoBody,
  DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS,
  obtenerEstadoModificacionItemsDux,
  postModificarItemsDux,
  sleepMs,
  type DuxModificarItemProductoRequest,
} from "@/lib/duxItemModificarApi";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";

const LOG_TAG = "[actualizarCostoCxDux]";

/** Ítems por POST (mismo criterio de diff que export Excel). */
const BATCH_SIZE = 100;

/** Reintentos de polling hasta estado terminal. */
const POLL_MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;

const ESTADO_FINALIZADO = "FINALIZADO";

function logServiceError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_TAG}[${scope}]`, msg);
}

function filasToProductosDux(
  filas: Awaited<ReturnType<typeof listarFilasExportCostoCxDiff>>
): DuxModificarItemProductoRequest[] {
  return filas.map((f) => buildDuxModificarItemCostoBody(f.codigo, f.costo));
}

async function esperarProcesoItemsDux(
  idProceso: number
): Promise<{ estado: string; errores: string[] }> {
  let ultimo = { estado: "", errores: [] as string[] };

  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    if (i > 0) await sleepMs(POLL_INTERVAL_MS);
    ultimo = await obtenerEstadoModificacionItemsDux(idProceso);
    if (ultimo.estado.toUpperCase() === ESTADO_FINALIZADO) {
      return ultimo;
    }
  }

  return ultimo;
}

/**
 * Envía a DUX los costos CX PROD. donde difieren de `costo_compra` (misma lógica que Excel).
 * Por ítem: `cod_item`, `costo`, `precios: []`.
 */
export async function actualizarCostoCxEnDux(): Promise<
  ServiceResult<{
    cantidadEnviada: number;
    lotes: number;
    idProcesoUltimo: number | null;
    estado: string;
    errores: string[];
  }>
> {
  try {
    const filas = await listarFilasExportCostoCxDiff();
    if (filas.length === 0) {
      return {
        success: false,
        error: "No hay productos con diferencia entre costo DUX y CX PROD.",
      };
    }

    const productos = filasToProductosDux(filas);
    const lotes: DuxModificarItemProductoRequest[][] = [];
    for (let i = 0; i < productos.length; i += BATCH_SIZE) {
      lotes.push(productos.slice(i, i + BATCH_SIZE));
    }

    let idProcesoUltimo: number | null = null;
    let estado = "";
    const erroresAcum: string[] = [];

    for (let i = 0; i < lotes.length; i++) {
      if (i > 0) {
        await sleepMs(DUX_ITEM_MODIFICAR_MIN_INTERVAL_MS);
      }

      const postRes = await postModificarItemsDux({ productos: lotes[i] });
      idProcesoUltimo = postRes.idProceso;

      if (postRes.idProceso == null) {
        return {
          success: false,
          error:
            postRes.message ||
            "DUX aceptó la petición pero no devolvió ID de proceso.",
        };
      }

      const poll = await esperarProcesoItemsDux(postRes.idProceso);
      estado = poll.estado;
      if (poll.errores.length > 0) {
        erroresAcum.push(...poll.errores);
      }

      if (poll.estado.toUpperCase() !== ESTADO_FINALIZADO) {
        return {
          success: false,
          error: `El proceso DUX ${postRes.idProceso} no finalizó a tiempo (estado: ${poll.estado || "desconocido"}).`,
        };
      }
    }

    if (erroresAcum.length > 0) {
      return {
        success: false,
        error: erroresAcum.slice(0, 5).join(" · "),
      };
    }

    return {
      success: true,
      data: {
        cantidadEnviada: productos.length,
        lotes: lotes.length,
        idProcesoUltimo,
        estado,
        errores: [],
      },
    };
  } catch (e) {
    logServiceError("actualizarCostoCxEnDux", e);
    const msg = e instanceof Error ? e.message : "Error al actualizar costos en DUX.";
    return { success: false, error: msg };
  }
}
