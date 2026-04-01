import { z } from "zod";
import type { ServiceResult } from "@/types";
import { getSiguienteComprobanteDuxCompra } from "@/services/duxCompras.service";
import { prisma } from "@/lib/prisma";
import {
  dateToIsoYmdArgentina,
  formatDdMmHhMmGuionesBajosArchivoArgentina,
} from "@/lib/fechaArgentina";

export const fechaFacturaIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Formato esperado: YYYY-MM-DD");

export const duxIdEmpresaComprasSchema = z
  .number()
  .int()
  .positive()
  .max(99999999);

export interface RecepcionPedidoExcelRow {
  "TIPO COMPROBANTE": "Comprobante_Compra";
  "COMPROBANTE": string;
  "ID PROVEEDOR": string;
  "FECHA": string;
  "FECHA IMPUTACION CONTABLE": string;
  "REALIZA RECEPCION": "SI";
  "DEPOSITO": string;
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
const RANGO_DIAS_CONSULTA_COMPROBANTE_DUX = 30;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Partes del calendario desde `YYYY-MM-DD` (sin conversión TZ; es la fecha de negocio). */
function parseIsoYmdParts(iso: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = iso.split("-");
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

function formatDuxDdMmYyyy(y: number, m: number, d: number): string {
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

function formatExcelDdMmYyyyDash(y: number, m: number, d: number): string {
  return `${pad2(d)}-${pad2(m)}-${y}`;
}

export async function getExportRecepcionPedidoExcelPayload(params: {
  pedidoHistoriaId: string;
  fechaFacturaIso: string; // YYYY-MM-DD
  idEmpresaCompras?: number;
  totalPedidoIngreso?: number;
}): Promise<ServiceResult<ExportRecepcionPedidoExcelPayload>> {
  const { pedidoHistoriaId, fechaFacturaIso, totalPedidoIngreso } = params;

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
        total: true,
        proveedor: { select: { idProveedorDux: true, prefijo: true } },
        sucursal: { select: { deposito: true } },
        items: { select: { codTienda: true, cantRecibida: true } },
      },
    });

    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    const itemsRecibidos = pedido.items
      .map((it) => ({
        codTienda: it.codTienda,
        cantRecibida: Number(it.cantRecibida ?? 0),
      }))
      .filter((it) => Number.isFinite(it.cantRecibida) && it.cantRecibida > 0);

    const sumCantRecibida = itemsRecibidos.reduce((s, it) => s + it.cantRecibida, 0);
    if (itemsRecibidos.length === 0) {
      return {
        success: false,
        error: "El pedido no tiene ítems con cantidad recibida mayor a cero.",
      };
    }

    const { y, m, d } = parseIsoYmdParts(fechaFacturaIso);
    const fechaFacturaExcel = formatExcelDdMmYyyyDash(y, m, d);

    // La numeración de comprobante siempre se consulta con "hoy" (Argentina),
    // independiente de la fecha de recepción/factura cargada en el modal.
    const hoyIsoArgentina = dateToIsoYmdArgentina(new Date());
    const { y: yHoy, m: mHoy, d: dHoy } = parseIsoYmdParts(hoyIsoArgentina);

    const hoyUtc = new Date(Date.UTC(yHoy, mHoy - 1, dHoy));
    const desdeUtc = new Date(hoyUtc);
    desdeUtc.setUTCDate(hoyUtc.getUTCDate() - RANGO_DIAS_CONSULTA_COMPROBANTE_DUX);
    const fechaDesdeComprobante = formatDuxDdMmYyyy(
      desdeUtc.getUTCFullYear(),
      desdeUtc.getUTCMonth() + 1,
      desdeUtc.getUTCDate()
    );
    const fechaHastaComprobante = formatDuxDdMmYyyy(yHoy, mHoy, dHoy);

    const { siguienteComprobante, totalImporte } =
      await getSiguienteComprobanteDuxCompra({
        fechaDesde: fechaDesdeComprobante,
        fechaHasta: fechaHastaComprobante,
        idEmpresa: idEmpresaParsed.data,
      });

    const totalPersistido = pedido.total == null ? null : Number(pedido.total);
    const totalParaPrecio =
      totalPedidoIngreso != null && Number.isFinite(totalPedidoIngreso) && totalPedidoIngreso > 0
        ? totalPedidoIngreso
        : totalPersistido != null && Number.isFinite(totalPersistido) && totalPersistido > 0
          ? totalPersistido
          : totalImporte;
    const precioBruto = sumCantRecibida > 0 ? totalParaPrecio / sumCantRecibida : 0;
    const precio = Number(precioBruto.toFixed(2));

    const rows: RecepcionPedidoExcelRow[] = itemsRecibidos.map((it) => ({
      "TIPO COMPROBANTE": "Comprobante_Compra",
      "COMPROBANTE": siguienteComprobante,
      "ID PROVEEDOR": (pedido.proveedor.idProveedorDux ?? "").trim(),
      "FECHA": fechaFacturaExcel,
      "FECHA IMPUTACION CONTABLE": fechaFacturaExcel,
      "REALIZA RECEPCION": "SI",
      "DEPOSITO": (pedido.sucursal.deposito ?? "").trim(),
      "CÓDIGO PRODUCTO": it.codTienda,
      "CANTIDAD": it.cantRecibida,
      "PRECIO": precio,
      "PRECIO INCLUYE IVA": "NO",
    }));

    const stamp = formatDdMmHhMmGuionesBajosArchivoArgentina(new Date());
    const prefijoProveedor = (pedido.proveedor.prefijo ?? "").trim() || "SIN_PREFIJO";
    const filename = `Recepcion Pedido - ${prefijoProveedor} - ${stamp}.xls`;

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

