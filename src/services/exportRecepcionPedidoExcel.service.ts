import { z } from "zod";
import type { ServiceResult } from "@/types";
import { getSiguienteComprobanteDuxCompra } from "@/services/duxCompras.service";
import { prisma } from "@/lib/prisma";

export const fechaFacturaIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Formato esperado: YYYY-MM-DD");

export const duxIdEmpresaComprasSchema = z
  .number()
  .int()
  .positive()
  .max(99999999);

export interface RecepcionPedidoExcelRow {
  "TIPO DE COMPROBANTE": "Comprobante_Compra";
  "COMPROBANTE": string;
  "ID PROVEEDOR": string;
  "FECHA": string;
  "FECHA IMPUTACIÓN CONTABLE": string;
  "REALIZA RECEPCIÓN": "SI";
  "DEPÓSITO": string;
  "CÓDIGO PRODUCTO": string;
  "CANTIDAD": number;
  "PRECIO": number;
  "PRECIO INCLUYE IVA": "NO";
}

export interface ExportRecepcionPedidoExcelPayload {
  sheetName: string;
  filename: string;
  rows: RecepcionPedidoExcelRow[];
}

const DUX_ID_EMPRESA_COMPRAS_DEFAULT = 2482;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoToDate(iso: string): Date {
  // Input: YYYY-MM-DD. Construimos en TZ local sin parsers raros.
  const [yyyy, mm, dd] = iso.split("-").map((s) => Number(s));
  return new Date(yyyy, mm - 1, dd);
}

function formatDuxDateDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastDayOfMonth(d: Date): Date {
  // day 0 of next month = last day of current month
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export async function getExportRecepcionPedidoExcelPayload(params: {
  pedidoHistoriaId: string;
  fechaFacturaIso: string; // YYYY-MM-DD
  idEmpresaCompras?: number;
}): Promise<ServiceResult<ExportRecepcionPedidoExcelPayload>> {
  const { pedidoHistoriaId, fechaFacturaIso } = params;

  const fechaParsed = fechaFacturaIsoSchema.safeParse(fechaFacturaIso);
  if (!fechaParsed.success) {
    return { success: false, error: "Fecha de factura inválida." };
  }

  const idEmpresaCompras =
    params.idEmpresaCompras ??
    (process.env.DUX_ID_EMPRESA_COMPRAS
      ? Number(process.env.DUX_ID_EMPRESA_COMPRAS)
      : DUX_ID_EMPRESA_COMPRAS_DEFAULT);

  const idEmpresaParsed = duxIdEmpresaComprasSchema.safeParse(idEmpresaCompras);
  if (!idEmpresaParsed.success) {
    return { success: false, error: "ID Empresa (DUX) inválido." };
  }

  try {
    const pedido = await prisma.pedidoHistoria.findUnique({
      where: { id: pedidoHistoriaId },
      select: {
        proveedor: { select: { idProveedorDux: true } },
        sucursal: { select: { deposito: true } },
        items: { select: { codTienda: true, cantRecibida: true } },
      },
    });

    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    const itemsRecibidos = pedido.items
      .filter((it) => it.cantRecibida != null)
      .map((it) => ({
        codTienda: it.codTienda,
        cantRecibida: Math.max(0, Number(it.cantRecibida) || 0),
      }));

    const sumCantRecibida = itemsRecibidos.reduce((s, it) => s + it.cantRecibida, 0);
    if (itemsRecibidos.length === 0) {
      return { success: false, error: "El pedido no tiene ítems con cantidad recibida." };
    }

    const fechaD = isoToDate(fechaFacturaIso);
    const fechaDesde = formatDuxDateDDMMYYYY(firstDayOfMonth(fechaD));
    const fechaHasta = formatDuxDateDDMMYYYY(lastDayOfMonth(fechaD));
    const fechaFacturaDux = formatDuxDateDDMMYYYY(fechaD);

    const { siguienteComprobante, totalImporte } =
      await getSiguienteComprobanteDuxCompra({
        fechaDesde,
        fechaHasta,
        idEmpresa: idEmpresaParsed.data,
      });

    const precio = totalImporte > 0 ? sumCantRecibida / totalImporte : 0;

    const rows: RecepcionPedidoExcelRow[] = itemsRecibidos.map((it) => ({
      "TIPO DE COMPROBANTE": "Comprobante_Compra",
      "COMPROBANTE": siguienteComprobante,
      "ID PROVEEDOR": (pedido.proveedor.idProveedorDux ?? "").trim(),
      "FECHA": fechaFacturaDux,
      "FECHA IMPUTACIÓN CONTABLE": fechaFacturaDux,
      "REALIZA RECEPCIÓN": "SI",
      "DEPÓSITO": (pedido.sucursal.deposito ?? "").trim(),
      "CÓDIGO PRODUCTO": it.codTienda,
      "CANTIDAD": it.cantRecibida,
      "PRECIO": precio,
      "PRECIO INCLUYE IVA": "NO",
    }));

    const d = fechaD;
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const filename = `Recepcion Del Pedido - ${dd}-${mm}-${yyyy}.xls`;

    return {
      success: true,
      data: {
        sheetName: "Recepción Pedido",
        filename,
        rows,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al preparar el Excel de recepción.";
    return { success: false, error: msg };
  }
}

