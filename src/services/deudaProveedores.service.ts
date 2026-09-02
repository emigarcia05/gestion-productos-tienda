import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SQL_CTE_CUOTAS_MERCADERIA } from "@/lib/comprobanteCuotasPlazoPago";
import {
  FLUJO_FONDO_DETALLE_MERCADERIA,
  ordenarDetallesFlujoDia,
  type FlujoFondoDetalleDiaFila,
} from "@/services/vencimientosPorFecha.service";

/**
 * Saldo por **cuota** repartido en columnas según fecha de vencimiento vs hoy (AR).
 * Plan: hasta 4 plazos; cuotas iguales sobre total; pagos FIFO.
 */
export interface DeudaProveedorFila {
  idProveedorDux: string;
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
    WITH ${Prisma.raw(SQL_CTE_CUOTAS_MERCADERIA)},
    lineas AS (
      SELECT
        cm.id_proveedor_dux,
        cm.nombre,
        cm.saldo_cuota AS saldo,
        cm.fecha_venc,
        (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS hoy
      FROM cuotas_mercaderia cm
      WHERE cm.saldo_cuota > 0
    )
    SELECT
      l.id_proveedor_dux AS "idProveedorDux",
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

type DeudaProveedorDetalleLineaRaw = {
  proveedor: string;
  saldo: Prisma.Decimal;
  comprobanteId: string;
  fechaComp: string;
  fechaVenc: string;
  nroCuota: number;
};

export async function listarDetalleDeudaProveedoresMercaderia(): Promise<{
  hoyIso: string;
  detalleLineas: FlujoFondoDetalleDiaFila[];
}> {
  const [hoyRows, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ hoy: string }>>`
      SELECT ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::text AS hoy
    `,
    prisma.$queryRaw<DeudaProveedorDetalleLineaRaw[]>`
      WITH ${Prisma.raw(SQL_CTE_CUOTAS_MERCADERIA)}
      SELECT
        cm.nombre AS proveedor,
        cm.saldo_cuota AS saldo,
        (cm.id::text || ':' || cm.nro_cuota::text) AS "comprobanteId",
        cm.fecha_comp::text AS "fechaComp",
        cm.fecha_venc::text AS "fechaVenc",
        cm.nro_cuota AS "nroCuota"
      FROM cuotas_mercaderia cm
      WHERE cm.saldo_cuota > 0
      ORDER BY cm.nombre ASC, cm.fecha_comp ASC, cm.nro_cuota ASC
    `,
  ]);

  const detalleLineas = ordenarDetallesFlujoDia(
    rows.map((r) => ({
      fechaDevengadaIso: r.fechaComp.slice(0, 10),
      fechaVencimientoIso: r.fechaVenc.slice(0, 10),
      proveedor: r.proveedor.toUpperCase(),
      detalle: FLUJO_FONDO_DETALLE_MERCADERIA,
      monto: Number(r.saldo),
      sortFecha: r.fechaComp,
      sortId: r.comprobanteId,
    })),
  );

  return {
    hoyIso: hoyRows[0]?.hoy ?? "",
    detalleLineas,
  };
}
