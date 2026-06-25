import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Valor fijo de columna **Detalle** para vencimientos de comprobantes (mercadería). */
export const FLUJO_FONDO_DETALLE_MERCADERIA = "MERCADERÍA" as const;

/**
 * Líneas con saldo pendiente cuya **fecha de vencimiento** cae en `[fechaDesde, fechaHasta]`.
 * Misma regla que deuda proveedores: `fecha_comp` + primer plazo de `plazos_pagos` (o 30 días).
 */
export interface VencimientoPorFechaLinea {
  fechaVenc: string;
  nombre: string;
  saldo: Prisma.Decimal;
  comprobanteId: string;
  /** `fecha_comp` (yyyy-mm-dd). Orden y desempate con gastos. */
  fechaComp: string;
}

export async function listarVencimientosEnRango(
  fechaDesde: string,
  fechaHasta: string
): Promise<VencimientoPorFechaLinea[]> {
  const rows = await prisma.$queryRaw<VencimientoPorFechaLinea[]>`
    WITH lineas AS (
      SELECT
        c.id::text AS id,
        c.fecha_comp::text AS fecha_comp,
        p.nombre AS nombre,
        (c.total - c.monto_aplicado) AS saldo,
        (
          c.fecha_comp::date
          + GREATEST(
            1,
            COALESCE(
              CASE
                WHEN trim(split_part(COALESCE(p.plazos_pagos, ''), ',', 1)) ~ '^[0-9]+$'
                THEN trim(split_part(p.plazos_pagos, ',', 1))::int
                ELSE NULL
              END,
              30
            )
          )
        )::date AS fecha_venc
      FROM fin_compras_comprobante c
      INNER JOIN global_proveedores p ON p.id_proveedor_dux = c.id_proveedor
      WHERE c.total > c.monto_aplicado
    )
    SELECT
      l.fecha_venc::text AS "fechaVenc",
      l.nombre AS nombre,
      l.saldo AS saldo,
      l.id AS "comprobanteId",
      l.fecha_comp AS "fechaComp"
    FROM lineas l
    WHERE l.fecha_venc >= ${fechaDesde}::date
      AND l.fecha_venc <= ${fechaHasta}::date
    ORDER BY l.fecha_venc ASC, l.nombre ASC
  `;
  return rows;
}

/**
 * Fila de **Detalle del día** (comprobante o imputación de balance) y orden estable.
 * Orden: proveedor, detalle, `sortFecha` (fecha devengo o `fecha_comp`), `sortId`.
 */
export type FlujoFondoDetalleDiaFila = {
  fechaDevengadaIso: string;
  fechaVencimientoIso: string;
  proveedor: string;
  detalle: string;
  monto: number;
  sortFecha: string;
  sortId: string;
};

export function ordenarDetallesFlujoDia(
  filas: FlujoFondoDetalleDiaFila[]
): FlujoFondoDetalleDiaFila[] {
  return [...filas].sort((a, b) => {
    const p = a.proveedor.localeCompare(b.proveedor, "es");
    if (p !== 0) return p;
    const d = a.detalle.localeCompare(b.detalle, "es");
    if (d !== 0) return d;
    const f = a.sortFecha.localeCompare(b.sortFecha);
    if (f !== 0) return f;
    return a.sortId.localeCompare(b.sortId);
  });
}

/**
 * Suma de saldos pendientes cuya **fecha de vencimiento** es **estrictamente anterior** a `fechaIso`
 * (misma regla de `fecha_venc` que {@link listarVencimientosEnRango}). Sirve para arrastrar a
 * Pendiente vencido antes de la ventana (insumo del **SALDO** de la primera fila en Flujo de Fondo).
 */
export async function sumarSaldoVencimientosConFechaVencAnteriorA(
  fechaIso: string
): Promise<number> {
  const rows = await prisma.$queryRaw<[{ total: Prisma.Decimal | null }]>`
    WITH lineas AS (
      SELECT
        (c.total - c.monto_aplicado) AS saldo,
        (
          c.fecha_comp::date
          + GREATEST(
            1,
            COALESCE(
              CASE
                WHEN trim(split_part(COALESCE(p.plazos_pagos, ''), ',', 1)) ~ '^[0-9]+$'
                THEN trim(split_part(p.plazos_pagos, ',', 1))::int
                ELSE NULL
              END,
              30
            )
          )
        )::date AS fecha_venc
      FROM fin_compras_comprobante c
      INNER JOIN global_proveedores p ON p.id_proveedor_dux = c.id_proveedor
      WHERE c.total > c.monto_aplicado
    )
    SELECT COALESCE(SUM(l.saldo), 0)::numeric AS total
    FROM lineas l
    WHERE l.fecha_venc < ${fechaIso}::date
  `;
  return Number(rows[0]?.total ?? 0);
}
