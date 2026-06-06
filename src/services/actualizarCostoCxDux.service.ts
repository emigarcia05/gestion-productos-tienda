import type { ServiceResult } from "@/types";
import {
  buildDuxModificarItemCostoBody,
  obtenerEstadoModificacionItemsDux,
  postModificarItemsDux,
  type DuxModificarItemProductoRequest,
} from "@/lib/duxItemModificarApi";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";

const LOG_TAG = "[actualizarCostoCxDux]";

/** Ítems por POST (mismo criterio de diff que export Excel). */
const BATCH_SIZE = 100;

/** Reintentos de polling hasta estado terminal (1 consulta cada ≥ 5 s vía throttle API). */
const POLL_MAX_ATTEMPTS = 24;

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
    ultimo = await obtenerEstadoModificacionItemsDux(idProceso);
    if (ultimo.estado.toUpperCase() === ESTADO_FINALIZADO) {
      return ultimo;
    }
  }

  return ultimo;
}

/**
 * Envía a DUX ítems donde `costo_compra` ≠ `px_compra_final_sin_iva` del proveedor
 * vinculado por `costo_compra_cod_ext`. Por ítem: `cod_item`, `costo`, `precios: []`.
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
        error: "No hay productos con diferencia entre costo DUX y precio del proveedor BASE.",
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
