import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SQL_FECHA_VENC_COMPROBANTE,
  SQL_PLAZO_PAGO_DIAS_COMPROBANTE,
} from "@/lib/comprobanteProveedorPlazoPagoSql";
import type { ServiceResult } from "@/types/service.types";

export interface ControlComprobanteFila {
  id: string;
  fechaComp: string;
  proveedorNombre: string;
  sucursalNombre: string;
  comprobante: string;
  total: Prisma.Decimal;
  montoAplicado: Prisma.Decimal;
  vencimientoSaldo: Prisma.Decimal;
  controlado: boolean;
  plazoPagoDias: number | null;
  plazoEfectivoDias: number;
  plazoProveedorDefault: number;
  fechaVenc: string;
}

/**
 * Lista comprobantes con columna de vencimiento:
 * - Si el saldo está vencido según `fecha_venc`, devuelve el saldo pendiente.
 * - Si no está vencido, devuelve 0.
 */
export async function listarControlComprobantes(): Promise<ControlComprobanteFila[]> {
  const rows = await prisma.$queryRaw<ControlComprobanteFila[]>`
    WITH lineas AS (
      SELECT
        c.id AS id,
        c.fecha_comp::text AS fecha_comp,
        p.nombre AS proveedor_nombre,
        c.id_sucursal_empresa AS id_sucursal_empresa,
        COALESCE(s.nombre, c.id_sucursal_empresa) AS sucursal_nombre,
        c.comprobante AS comprobante,
        c.total AS total,
        c.monto_aplicado AS monto_aplicado,
        (c.total - c.monto_aplicado) AS saldo,
        c.controlado AS controlado,
        c.plazo_pago_dias AS plazo_pago_dias,
        (${Prisma.raw(SQL_PLAZO_PAGO_DIAS_COMPROBANTE)}) AS plazo_efectivo_dias,
        COALESCE(
          CASE
            WHEN trim(split_part(COALESCE(p.plazos_pagos, ''), ',', 1)) ~ '^[0-9]+$'
            THEN trim(split_part(p.plazos_pagos, ',', 1))::int
            ELSE NULL
          END,
          30
        ) AS plazo_proveedor_default,
        ${Prisma.raw(SQL_FECHA_VENC_COMPROBANTE)} AS fecha_venc,
        (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS hoy
      FROM fin_compras_comprobante c
      INNER JOIN global_proveedores p ON p.id_proveedor_dux = c.id_proveedor
      LEFT JOIN global_sucursales s ON COALESCE(s.id_dux, '') = c.id_sucursal_empresa
    )
    SELECT
      l.id AS id,
      l.fecha_comp AS "fechaComp",
      l.proveedor_nombre AS "proveedorNombre",
      l.sucursal_nombre AS "sucursalNombre",
      l.comprobante AS comprobante,
      l.total AS total,
      l.monto_aplicado AS "montoAplicado",
      CASE
        WHEN l.saldo > 0 AND l.fecha_venc < l.hoy THEN l.saldo
        ELSE 0
      END::numeric AS "vencimientoSaldo",
      l.controlado AS controlado,
      l.plazo_pago_dias AS "plazoPagoDias",
      l.plazo_efectivo_dias AS "plazoEfectivoDias",
      l.plazo_proveedor_default AS "plazoProveedorDefault",
      l.fecha_venc::text AS "fechaVenc"
    FROM lineas l
    ORDER BY l.fecha_comp ASC, l.proveedor_nombre ASC, l.comprobante ASC
  `;

  return rows;
}

export async function actualizarControladoComprobante(
  id: string,
  controlado: boolean
): Promise<ServiceResult<void>> {
  try {
    await prisma.comprobanteProveedor.update({
      where: { id },
      data: { controlado },
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el estado de controlado.";
    return { success: false, error: message };
  }
}

export async function actualizarPlazoPagoComprobante(
  id: string,
  plazoPagoDias: number | null
): Promise<ServiceResult<void>> {
  try {
    await prisma.comprobanteProveedor.update({
      where: { id },
      data: { plazoPagoDias },
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el plazo de pago.";
    return { success: false, error: message };
  }
}
