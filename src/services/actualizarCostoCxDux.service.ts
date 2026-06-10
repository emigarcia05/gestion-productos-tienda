import type { ServiceResult } from "@/types";
import {
  buildDuxModificarItemCostoBody,
  obtenerEstadoModificacionItemsDux,
  postModificarItemsDux,
  type DuxModificarItemProductoRequest,
} from "@/lib/duxItemModificarApi";
import { obtenerFilasActCxParaEnvio } from "@/lib/actCxFilasCache";
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

function buildLotesProductosCostoCx(
  filas: Awaited<ReturnType<typeof listarFilasExportCostoCxDiff>>
): DuxModificarItemProductoRequest[][] {
  const productos = filasToProductosDux(filas);
  const lotes: DuxModificarItemProductoRequest[][] = [];
  for (let i = 0; i < productos.length; i += DUX_API_BATCH_SIZE) {
    lotes.push(productos.slice(i, i + DUX_API_BATCH_SIZE));
  }
  return lotes;
}

/** Resumen de lotes a enviar (sin POST). */
export async function prepararEnvioCostosCxADux(): Promise<
  ServiceResult<{
    cantidadEnviada: number;
    lotes: number;
    loteSize: number;
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
    const lotes = buildLotesProductosCostoCx(filas);
    return {
      success: true,
      data: {
        cantidadEnviada: filas.length,
        lotes: lotes.length,
        loteSize: DUX_API_BATCH_SIZE,
      },
    };
  } catch (e) {
    logServiceError("prepararEnvioCostosCxADux", e);
    const msg = e instanceof Error ? e.message : "Error al preparar envío a DUX.";
    return { success: false, error: msg };
  }
}

/** Un POST DUX (un lote). Índice 0-based. */
export async function enviarLoteCostoCxADux(loteIndex: number): Promise<
  ServiceResult<{
    idProceso: number;
    itemsEnLote: number;
    itemsCompletadosAntes: number;
    loteIndex: number;
    lotesTotal: number;
    cantidadEnviada: number;
  }>
> {
  if (!Number.isInteger(loteIndex) || loteIndex < 0) {
    return { success: false, error: "Índice de lote inválido." };
  }

  try {
    const filas = await obtenerFilasActCxParaEnvio();
    if (filas.length === 0) {
      return {
        success: false,
        error: "No hay productos con diferencia entre costo DUX y precio del proveedor BASE.",
      };
    }

    const lotes = buildLotesProductosCostoCx(filas);
    const lote = lotes[loteIndex];
    if (!lote?.length) {
      return { success: false, error: `Lote ${loteIndex + 1} inexistente o vacío.` };
    }

    const itemsCompletadosAntes = lotes
      .slice(0, loteIndex)
      .reduce((acc, l) => acc + l.length, 0);

    const postRes = await postModificarItemsDux({ productos: lote });
    if (postRes.idProceso == null) {
      return {
        success: false,
        error:
          postRes.message ||
          "DUX aceptó la petición pero no devolvió ID de proceso.",
      };
    }

    return {
      success: true,
      data: {
        idProceso: postRes.idProceso,
        itemsEnLote: lote.length,
        itemsCompletadosAntes,
        loteIndex,
        lotesTotal: lotes.length,
        cantidadEnviada: filas.length,
      },
    };
  } catch (e) {
    logServiceError("enviarLoteCostoCxADux", e);
    const msg = e instanceof Error ? e.message : "Error al enviar lote a DUX.";
    return { success: false, error: msg };
  }
}

/**
 * POST a DUX (todos los lotes en una corrida). Preferir `enviarLoteCostoCxADux` desde UI.
 * @deprecated Bloqueante; puede exceder timeout serverless con muchos ítems.
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
    const lotes = buildLotesProductosCostoCx(filas);

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
