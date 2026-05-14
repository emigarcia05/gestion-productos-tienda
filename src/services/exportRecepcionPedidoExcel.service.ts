import { z } from "zod";
import { IvaProveedor, Prisma } from "@prisma/client";
import type { ServiceResult } from "@/types";
import { prisma } from "@/lib/prisma";
import { formatDdMmHhMmGuionesBajosArchivoArgentina } from "@/lib/fechaArgentina";

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

/**
 * Valor permitido en la columna "TIPO COMPROBANTE" del Excel de recepción.
 * Se resuelve a partir de `proveedor.iva` (ver `resolverTipoComprobantePorIva`).
 */
export type TipoComprobanteRecepcion = "FACTURA" | "Comprobante_Compra";

/**
 * Marker de error semántico que devuelve el servicio cuando `proveedor.iva = PREGUNTA`
 * y no se proporcionó una decisión explícita. La UI debe abrir el modal
 * "¿La compra genera comprobante fiscal?" y reintentar con `decisionFiscal`.
 */
export const ERROR_REQUIERE_DECISION_FISCAL = "REQUIERE_DECISION_FISCAL" as const;

/**
 * Aplica la regla de negocio `proveedor.iva → tipoComprobante`:
 * - SIEMPRE  → "FACTURA" (columna Excel en mayúsculas; DUX usa `tipo_comp` FACTURA)
 * - NUNCA    → "Comprobante_Compra"
 * - PREGUNTA → depende de `decisionFiscal` (SI/NO del modal de confirmación):
 *   - true  → "FACTURA"
 *   - false → "Comprobante_Compra"
 *   - null/undefined → `null` (la UI debe pedir la decisión antes de exportar).
 */
export function resolverTipoComprobantePorIva(
  iva: IvaProveedor,
  decisionFiscal: boolean | null | undefined
): TipoComprobanteRecepcion | null {
  if (iva === IvaProveedor.SIEMPRE) return "FACTURA";
  if (iva === IvaProveedor.NUNCA) return "Comprobante_Compra";
  if (decisionFiscal === true) return "FACTURA";
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

const AJUSTE_MAXIMO_PRECIO_UNITARIO_CENTAVOS = 10; // +/- 0.10 respecto al precio base
const TOLERANCIA_TOTAL_EXPORTACION = 0.1; // diferencia máxima permitida contra total ingresado

/** Fila única en `prod_ped_ult_comp` (ver migración `20260518120000_add_prod_ped_ult_comp`). */
const PROD_PED_ULT_COMP_ROW_ID = 1;

/**
 * Incrementa en 1 el último comprobante (texto sólo dígitos) y devuelve el **nuevo** valor
 * en una sola sentencia SQL (sin carrera entre peticiones).
 */
async function reservarSiguienteComprobanteRecepcion(): Promise<ServiceResult<string>> {
  try {
    const rows = await prisma.$queryRaw<Array<{ ult_comprobante: string }>>(
      Prisma.sql`
        UPDATE "prod_ped_ult_comp"
        SET "ult_comprobante" = ((btrim("ult_comprobante"))::bigint + 1)::text
        WHERE "id" = ${PROD_PED_ULT_COMP_ROW_ID}
        RETURNING "ult_comprobante" AS ult_comprobante
      `
    );
    const v = rows[0]?.ult_comprobante?.trim();
    if (!v) {
      return {
        success: false,
        error:
          "No se pudo obtener el correlativo de comprobante (falta la fila en prod_ped_ult_comp; ejecutá migraciones).",
      };
    }
    return { success: true, data: v };
  } catch (e) {
    logServiceError("reservarSiguienteComprobanteRecepcion", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid input syntax for type bigint/i.test(msg)) {
      return {
        success: false,
        error:
          "El correlativo en prod_ped_ult_comp debe ser sólo dígitos; corregilo en base de datos.",
      };
    }
    return { success: false, error: "No se pudo asignar el correlativo de comprobante." };
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Partes del calendario desde `YYYY-MM-DD` (sin conversión TZ; es la fecha de negocio). */
function parseIsoYmdParts(iso: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = iso.split("-");
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

function formatExcelDdMmYyyyDash(y: number, m: number, d: number): string {
  return `${pad2(d)}-${pad2(m)}-${y}`;
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

  try {
    const pedido = await prisma.pedidoHistoria.findUnique({
      where: { id: pedidoHistoriaId },
      select: {
        total: true,
        estado: true,
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

    const totalPersistido = pedido.total == null ? null : Number(pedido.total);
    const totalParaPrecio =
      totalPedidoIngreso != null && Number.isFinite(totalPedidoIngreso) && totalPedidoIngreso > 0
        ? totalPedidoIngreso
        : totalPersistido != null && Number.isFinite(totalPersistido) && totalPersistido > 0
          ? totalPersistido
          : null;

    if (totalParaPrecio == null) {
      return {
        success: false,
        error:
          "Falta un total válido para calcular precios en el Excel (ingresá TOTAL PEDIDO o registrá la recepción con total).",
      };
    }

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

    const compRes = await reservarSiguienteComprobanteRecepcion();
    if (!compRes.success) return compRes;
    const comprobanteExport = compRes.data;

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
