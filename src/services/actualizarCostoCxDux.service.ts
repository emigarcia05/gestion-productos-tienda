import type { ServiceResult } from "@/types";
import {
  buildDuxModificarItemCostoBody,
  obtenerEstadoModificacionItemsDux,
  postModificarItemsDux,
  type DuxModificarItemProductoRequest,
} from "@/lib/duxItemModificarApi";
import { DUX_API_BATCH_SIZE } from "@/lib/duxApiBatchPolicy";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";

const LOG_TAG = "[actualizarCostoCxDux]";

export const ESTADO_PROCESO_COSTO_CX_FINALIZADO = "FINALIZADO";

function logServiceError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_TAG}[${scope}]`, msg);
}

function filasToProductosDux(
  filas: Awaited<ReturnType<typeof listarFilasExportCostoCxDiff>>
): DuxModificarItemProductoRequest[] {
  return filas.map((f) => buildDuxModificarItemCostoBody(f.codigo, f.costo));
}

export function esEstadoProcesoCostoCxFinalizado(estado: string): boolean {
  return estado.trim().toUpperCase() === ESTADO_PROCESO_COSTO_CX_FINALIZADO;
}

/**
 * POST a DUX (sin polling). Devuelve los `idProceso` de cada lote enviado.
 */
export async function enviarCostosCxADux(): Promise<
  ServiceResult<{
    cantidadEnviada: number;
    lotes: number;
    idsProceso: number[];
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
    for (let i = 0; i < productos.length; i += DUX_API_BATCH_SIZE) {
      lotes.push(productos.slice(i, i + DUX_API_BATCH_SIZE));
    }

    const idsProceso: number[] = [];

    for (const lote of lotes) {
      const postRes = await postModificarItemsDux({ productos: lote });
      if (postRes.idProceso == null) {
        return {
          success: false,
          error:
            postRes.message ||
            "DUX aceptó la petición pero no devolvió ID de proceso.",
        };
      }
      idsProceso.push(postRes.idProceso);
    }

    return {
      success: true,
      data: {
        cantidadEnviada: productos.length,
        lotes: lotes.length,
        idsProceso,
      },
    };
  } catch (e) {
    logServiceError("enviarCostosCxADux", e);
    const msg = e instanceof Error ? e.message : "Error al enviar costos a DUX.";
    return { success: false, error: msg };
  }
}

/** Una consulta de estado del proceso DUX (para polling desde el cliente). */
export async function consultarEstadoEnvioCostoCxDux(
  idProceso: number
): Promise<
  ServiceResult<{
    estado: string;
    errores: string[];
    finalizado: boolean;
  }>
> {
  if (!Number.isFinite(idProceso) || idProceso <= 0) {
    return { success: false, error: "ID de proceso DUX inválido." };
  }

  try {
    const poll = await obtenerEstadoModificacionItemsDux(idProceso);
    return {
      success: true,
      data: {
        estado: poll.estado,
        errores: poll.errores,
        finalizado: esEstadoProcesoCostoCxFinalizado(poll.estado),
      },
    };
  } catch (e) {
    logServiceError("consultarEstadoEnvioCostoCxDux", e);
    const msg = e instanceof Error ? e.message : "Error al consultar estado en DUX.";
    return { success: false, error: msg };
  }
}

/** Flujo bloqueante legacy (polling en servidor). Preferir enviar + consultar desde UI. */
export async function actualizarCostoCxEnDux(): Promise<
  ServiceResult<{
    cantidadEnviada: number;
    lotes: number;
    idProcesoUltimo: number | null;
    estado: string;
    errores: string[];
  }>
> {
  const envio = await enviarCostosCxADux();
  if (!envio.success) return envio;

  const erroresAcum: string[] = [];
  let estado = "";
  let idProcesoUltimo: number | null = null;

  for (const idProceso of envio.data.idsProceso) {
    idProcesoUltimo = idProceso;
    const poll = await consultarEstadoEnvioCostoCxDux(idProceso);
    if (!poll.success) return poll;
    estado = poll.data.estado;
    if (poll.data.errores.length > 0) {
      erroresAcum.push(...poll.data.errores);
    }
    if (!poll.data.finalizado) {
      return {
        success: false,
        error: `El proceso DUX ${idProceso} no está finalizado (estado: ${estado || "desconocido"}).`,
      };
    }
  }

  return {
    success: true,
    data: {
      cantidadEnviada: envio.data.cantidadEnviada,
      lotes: envio.data.lotes,
      idProcesoUltimo,
      estado,
      errores: erroresAcum,
    },
  };
}
