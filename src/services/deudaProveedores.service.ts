import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Saldo por comprobante repartido en columnas según **fecha de vencimiento** vs **hoy (AR)**:
 * - `fecha_venc` = `fecha_comp` + primer entero de `global_proveedores.plazos_pagos` (CSV), mínimo 1 día; si falta o no es numérico → **30** días.
 * - **VENCIDA**: `fecha_venc` &lt; hoy
 * - **5 DÍAS**: hoy ≤ `fecha_venc` ≤ hoy+5
 * - **30 DÍAS**: hoy+6 … hoy+30
 * - **45 DÍAS**: hoy+31 … hoy+45
 * - **60 DÍAS**: `fecha_venc` ≥ hoy+46 (incluye vencimientos posteriores)
 */
export interface DeudaProveedorFila {
  nombre: string;
  deudaTotal: Prisma.Decimal;
  vencida: Prisma.Decimal;
  dias5: Prisma.Decimal;
  dias30: Prisma.Decimal;
  dias45: Prisma.Decimal;
  dias60: Prisma.Decimal;
}

export async function listarDeudaProveedores(): Promise<DeudaProveedorFila[]> {
  const rows = await prisma.$queryRaw<DeudaProveedorFila[]>`
    WITH lineas AS (
      SELECT
        p.id_proveedor_dux AS id_proveedor_dux,
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
        )::date AS fecha_venc,
        (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS hoy
      FROM fin_compras_comprobante c
      INNER JOIN global_proveedores p ON p.id_proveedor_dux = c.id_proveedor
      WHERE c.total > c.monto_aplicado
    )
    SELECT
      l.nombre AS nombre,
      SUM(l.saldo) AS "deudaTotal",
      SUM(CASE WHEN l.fecha_venc < l.hoy THEN l.saldo ELSE 0 END) AS vencida,
      SUM(CASE WHEN l.fecha_venc >= l.hoy AND l.fecha_venc <= l.hoy + 5 THEN l.saldo ELSE 0 END) AS "dias5",
      SUM(CASE WHEN l.fecha_venc >= l.hoy + 6 AND l.fecha_venc <= l.hoy + 30 THEN l.saldo ELSE 0 END) AS "dias30",
      SUM(CASE WHEN l.fecha_venc >= l.hoy + 31 AND l.fecha_venc <= l.hoy + 45 THEN l.saldo ELSE 0 END) AS "dias45",
      SUM(CASE WHEN l.fecha_venc >= l.hoy + 46 THEN l.saldo ELSE 0 END) AS "dias60"
    FROM lineas l
    GROUP BY l.id_proveedor_dux, l.nombre
    HAVING SUM(l.saldo) > 0
    ORDER BY SUM(l.saldo) DESC
  `;
  return rows;
}
