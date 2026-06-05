import type { ServiceResult } from "@/types";
import {
  type V2CrearCompraRequest,
  postCompraV2,
} from "@/lib/duxComprasV2Api";
import {
  prepararRecepcionCompraDatos,
  type RecepcionCompraDatosPreparados,
} from "@/services/exportRecepcionPedidoExcel.service";

const LOG_TAG = "[registrarRecepcionCompraDux]";

function logServiceError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_TAG}[${scope}]`, msg);
}

export function mapRecepcionCompraDatosToV2PostBody(
  datos: RecepcionCompraDatosPreparados
): V2CrearCompraRequest {
  return {
    id_empresa: datos.idEmpresa,
    id_sucursal: datos.idSucursal,
    fecha: datos.fechaIso,
    tipo_comprobante: datos.tipoComprobante,
    id_proveedor: datos.idProveedorDux,
    nro_comprobante: datos.nroComprobante,
    fecha_imputacion_contable: datos.fechaImputacionContableIso,
    id_deposito: datos.idDeposito,
    productos: datos.productos.map((p) => ({
      cod_item: p.codItem,
      ctd: p.ctd,
      precio_unitario: p.precioUnitario,
      porc_descuento: 0,
      observaciones: "",
    })),
  };
}

export async function registrarRecepcionCompraDux(params: {
  pedidoHistoriaId: string;
  fechaFacturaIso: string;
  totalPedidoIngreso?: number;
  decisionFiscal?: boolean;
}): Promise<ServiceResult<{ idCompra: number | null; nroComprobante: string }>> {
  try {
    const prep = await prepararRecepcionCompraDatos(params);
    if (!prep.success) return prep;

    const body = mapRecepcionCompraDatosToV2PostBody(prep.data);
    const res = await postCompraV2(body);

    const idCompra =
      res.datos.id_compra != null && Number.isFinite(Number(res.datos.id_compra))
        ? Number(res.datos.id_compra)
        : null;

    return {
      success: true,
      data: {
        idCompra,
        nroComprobante: prep.data.nroComprobante,
      },
    };
  } catch (e) {
    logServiceError("registrarRecepcionCompraDux", e);
    const msg = e instanceof Error ? e.message : "Error al registrar la compra en DUX.";
    return { success: false, error: msg };
  }
}
