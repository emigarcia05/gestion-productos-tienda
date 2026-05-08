import { z } from "zod";
import { IvaProveedor } from "@prisma/client";
import type { ServiceResult } from "@/types";
import { getSiguienteComprobanteDuxCompra } from "@/services/duxCompras.service";
import { prisma } from "@/lib/prisma";
import {
  dateToIsoYmdArgentina,
  formatDdMmHhMmGuionesBajosArchivoArgentina,
} from "@/lib/fechaArgentina";

/** Prefijo de log uniforme. Loggear en el catch evita que los errores queden
 *  opacos detrás de "An error occurred in the Server Components render…". */
const LOG_TAG = "[exportRecepcionPedidoExcel]";

function logServiceError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_TAG}[${scope}]`, msg);
}

export const fechaFacturaIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Formato esperado: YYYY-MM-DD");

export const duxIdEmpresaComprasSchema = z
  .number()
  .int()
  .positive()
  .max(99999999);

/**
 * Valor permitido en la columna "TIPO COMPROBANTE" del Excel de recepción.
 * Se resuelve a partir de `proveedor.iva` (ver `resolverTipoComprobantePorIva`).
 */
export type TipoComprobanteRecepcion = "Factura" | "Comprobante_Compra";

/**
 * Marker de error semántico que devuelve el servicio cuando `proveedor.iva = PREGUNTA`
 * y no se proporcionó una decisión explícita. La UI debe abrir el modal
 * "¿La compra genera comprobante fiscal?" y reintentar con `decisionFiscal`.
 */
export const ERROR_REQUIERE_DECISION_FISCAL = "REQUIERE_DECISION_FISCAL" as const;

/**
 * Aplica la regla de negocio `proveedor.iva → tipoComprobante`:
 * - SIEMPRE  → "Factura"
 * - NUNCA    → "Comprobante_Compra"
 * - PREGUNTA → depende de `decisionFiscal` (SI/NO del modal de confirmación):
 *   - true  → "Factura"
 *   - false → "Comprobante_Compra"
 *   - null/undefined → `null` (la UI debe pedir la decisión antes de exportar).
 */
export function resolverTipoComprobantePorIva(
  iva: IvaProveedor,
  decisionFiscal: boolean | null | undefined
): TipoComprobanteRecepcion | null {
  if (iva === IvaProveedor.SIEMPRE) return "Factura";
  if (iva === IvaProveedor.NUNCA) return "Comprobante_Compra";
  if (decisionFiscal === true) return "Factura";
  if (decisionFiscal === false) return "Comprobante_Compra";
  return null;
}

export interface RecepcionPedidoExcelRow {
  "TIPO COMPROBANTE": TipoComprobanteRecepcion;
  "COMPROBANTE": string;
  "ID PROVEEDOR": string;
  "FECHA": string;
  "FECHA IMPUTACION CONTABLE": string;
  "REALIZA RECEPCION": "SI";
  "DEPOSITO": string;
  "CÓDIGO PRODUCTO": string;
  "CANTIDAD": number;
  "PRECIO": number;
  "PRECIO INCLUYE IVA": "SI";
}

export interface ExportRecepcionPedidoExcelPayload {
  sheetName: string;
  filename: string;
  rows: RecepcionPedidoExcelRow[];
}

const DUX_ID_EMPRESA_COMPRAS_DEFAULT = 2482;
const RANGO_DIAS_CONSULTA_COMPROBANTE_DUX = 15;
const AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS = 10; // +/- 0.10 respecto al precio base
const TOLERANCIA_TOTAL_EXPORTACION = 0.1; // diferencia máxima permitida contra total ingresado

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

function sumarComprobante(baseComprobante: string, incremento: number): string {
  if (!/^\d+$/.test(baseComprobante)) {
    throw new Error("El comprobante DUX no es numérico.");
  }
  const inc = Math.max(0, Math.floor(incremento));
  return (BigInt(baseComprobante) + BigInt(inc)).toString();
}

function sumarDiasYmd(
  y: number,
  m: number,
  d: number,
  dias: number
): { y: number; m: number; d: number } {
  const baseUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  baseUtc.setUTCDate(baseUtc.getUTCDate() + dias);
  return {
    y: baseUtc.getUTCFullYear(),
    m: baseUtc.getUTCMonth() + 1,
    d: baseUtc.getUTCDate(),
  };
}

function toCentavos(value: number): number {
  return Math.round(value * 100);
}

function distribuirPreciosDiferenciales(params: {
  cantidades: number[];
  totalObjetivo: number;
}): { precios: number[]; totalCalculado: number; diferencia: number } {
  const { cantidades, totalObjetivo } = params;
  const sumaCantidades = cantidades.reduce((acc, c) => acc + c, 0);
  const totalObjetivoCentavos = toCentavos(totalObjetivo);
  const precioBaseCentavos =
    sumaCantidades > 0 ? Math.round(totalObjetivoCentavos / sumaCantidades) : 0;

  const preciosCentavos = cantidades.map(() => precioBaseCentavos);
  const deltas = cantidades.map(() => 0);
  let diffCentavos =
    totalObjetivoCentavos -
    cantidades.reduce((acc, cant) => acc + cant * precioBaseCentavos, 0);

  // Ajuste grueso: incrementos/decrementos de 0.01 por ítem respetando tope +/-0.10.
  const indicesPorCantidadDesc = cantidades
    .map((cant, idx) => ({ idx, cant }))
    .sort((a, b) => b.cant - a.cant)
    .map((x) => x.idx);
  const indicesPorCantidadAsc = [...indicesPorCantidadDesc].reverse();

  const aplicarPaso = (idx: number, paso: 1 | -1): boolean => {
    if (paso > 0 && deltas[idx] >= AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS) return false;
    if (paso < 0 && deltas[idx] <= -AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS) return false;
    deltas[idx] += paso;
    preciosCentavos[idx] += paso;
    diffCentavos -= cantidades[idx] * paso;
    return true;
  };

  const intentosMaximos = cantidades.length * AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS * 4;
  let intentos = 0;
  while (diffCentavos !== 0 && intentos < intentosMaximos) {
    intentos += 1;
    const signo: 1 | -1 = diffCentavos > 0 ? 1 : -1;
    const candidatos = signo > 0 ? indicesPorCantidadDesc : indicesPorCantidadAsc;
    let mejorIdx = -1;
    let mejorError = Number.POSITIVE_INFINITY;

    for (const idx of candidatos) {
      const deltaActual = deltas[idx];
      if (
        (signo > 0 && deltaActual >= AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS) ||
        (signo < 0 && deltaActual <= -AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS)
      ) {
        continue;
      }
      const nuevoDiff = diffCentavos - cantidades[idx] * signo;
      const errorAbs = Math.abs(nuevoDiff);
      if (errorAbs < mejorError) {
        mejorError = errorAbs;
        mejorIdx = idx;
        if (errorAbs === 0) break;
      }
    }

    if (mejorIdx === -1) break;
    const aplicado = aplicarPaso(mejorIdx, signo);
    if (!aplicado) break;
  }

  const precios = preciosCentavos.map((c) => c / 100);
  const totalCalculado = cantidades.reduce((acc, cant, idx) => acc + cant * precios[idx], 0);
  const diferencia = Number((totalObjetivo - totalCalculado).toFixed(2));

  return {
    precios,
    totalCalculado: Number(totalCalculado.toFixed(2)),
    diferencia,
  };
}

export async function getExportRecepcionPedidoExcelPayload(params: {
  pedidoHistoriaId: string;
  fechaFacturaIso: string; // YYYY-MM-DD
  idEmpresaCompras?: number;
  totalPedidoIngreso?: number;
  /**
   * SI/NO del modal "¿La compra genera comprobante fiscal?".
   * Solo se usa cuando `proveedor.iva === PREGUNTA`. Para `SIEMPRE`/`NUNCA`
   * la regla del enum prevalece y este valor se ignora.
   */
  decisionFiscal?: boolean;
}): Promise<ServiceResult<ExportRecepcionPedidoExcelPayload>> {
  const { pedidoHistoriaId, fechaFacturaIso, totalPedidoIngreso, decisionFiscal } = params;

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
        estado: true,
        recepcionNumero: true,
        proveedor: { select: { idProveedorDux: true, prefijo: true, iva: true } },
        sucursal: { select: { deposito: true } },
        items: { select: { codTienda: true, cantRecibida: true } },
      },
    });

    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    // Defensa de shape: las FK son NOT NULL en BD, pero protegemos el acceso
    // a `pedido.proveedor.iva` ante un cliente Prisma desactualizado o un
    // dato corrupto. Sin este check, antes saltaba como TypeError ("Cannot
    // read properties of undefined (reading 'iva')") atrapado por el catch
    // externo con un mensaje confuso.
    if (!pedido.proveedor || !pedido.sucursal) {
      logServiceError(
        "getExportRecepcionPedidoExcelPayload",
        `relaciones incompletas: proveedor=${!!pedido.proveedor} sucursal=${!!pedido.sucursal} pedidoId=${pedidoHistoriaId}`
      );
      return {
        success: false,
        error: "El pedido tiene datos incompletos (proveedor/sucursal).",
      };
    }

    const tipoComprobante = resolverTipoComprobantePorIva(
      pedido.proveedor.iva,
      decisionFiscal
    );
    if (tipoComprobante === null) {
      // proveedor.iva = PREGUNTA y la UI no envió decisionFiscal:
      // la Action propaga este `error` y el cliente abre el modal de confirmación.
      return { success: false, error: ERROR_REQUIERE_DECISION_FISCAL };
    }

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

    // Regla de negocio: FECHA se exporta como fecha seleccionada + 1 día.
    // FECHA IMPUTACION CONTABLE mantiene la fecha seleccionada en recepción.
    const { y, m, d } = parseIsoYmdParts(fechaFacturaIso);
    const { y: yMasUno, m: mMasUno, d: dMasUno } = sumarDiasYmd(y, m, d, 1);
    const fechaFacturaExcel = formatExcelDdMmYyyyDash(yMasUno, mMasUno, dMasUno);
    const fechaImputacionContableExcel = formatExcelDdMmYyyyDash(y, m, d);

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
    const hastaUtc = new Date(hoyUtc);
    hastaUtc.setUTCDate(hoyUtc.getUTCDate() + 1);
    const fechaHastaComprobante = formatDuxDdMmYyyy(
      hastaUtc.getUTCFullYear(),
      hastaUtc.getUTCMonth() + 1,
      hastaUtc.getUTCDate()
    );

    const { ultimoComprobante, totalImporte } =
      await getSiguienteComprobanteDuxCompra({
        fechaDesde: fechaDesdeComprobante,
        fechaHasta: fechaHastaComprobante,
        idEmpresa: idEmpresaParsed.data,
      });
    // Primera recepción (pedido pendiente): recepcionNumero todavía no fue incrementado.
    // Correcciones (pedido recepcionado): ya se incrementa al guardar la corrección.
    const recepcionOrdinal =
      pedido.estado === "RECEPCIONADO" ? pedido.recepcionNumero : pedido.recepcionNumero + 1;
    const comprobanteExport = sumarComprobante(ultimoComprobante, recepcionOrdinal);

    const totalPersistido = pedido.total == null ? null : Number(pedido.total);
    const totalParaPrecio =
      totalPedidoIngreso != null && Number.isFinite(totalPedidoIngreso) && totalPedidoIngreso > 0
        ? totalPedidoIngreso
        : totalPersistido != null && Number.isFinite(totalPersistido) && totalPersistido > 0
          ? totalPersistido
          : totalImporte;
    const cantidades = itemsRecibidos.map((it) => it.cantRecibida);
    const { precios, diferencia } = distribuirPreciosDiferenciales({
      cantidades,
      totalObjetivo: totalParaPrecio,
    });
    if (Math.abs(diferencia) > TOLERANCIA_TOTAL_EXPORTACION) {
      return {
        success: false,
        error:
          "No se pudo ajustar el total del Excel dentro de la tolerancia permitida (0,10).",
      };
    }

    const rows: RecepcionPedidoExcelRow[] = itemsRecibidos.map((it, index) => ({
      "TIPO COMPROBANTE": tipoComprobante,
      "COMPROBANTE": comprobanteExport,
      "ID PROVEEDOR": (pedido.proveedor.idProveedorDux ?? "").trim(),
      "FECHA": fechaFacturaExcel,
      "FECHA IMPUTACION CONTABLE": fechaImputacionContableExcel,
      "REALIZA RECEPCION": "SI",
      "DEPOSITO": (pedido.sucursal.deposito ?? "").trim(),
      "CÓDIGO PRODUCTO": it.codTienda,
      "CANTIDAD": it.cantRecibida,
      "PRECIO": precios[index],
      "PRECIO INCLUYE IVA": "SI",
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
    logServiceError("getExportRecepcionPedidoExcelPayload", e);
    const msg = e instanceof Error ? e.message : "Error al preparar el Excel de recepción.";
    return { success: false, error: msg };
  }
}

