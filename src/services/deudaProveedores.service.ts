import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SQL_FECHA_VENC_COMPROBANTE } from "@/lib/comprobanteProveedorPlazoPagoSql";
import {
  FLUJO_FONDO_DETALLE_MERCADERIA,
  ordenarDetallesFlujoDia,
  type FlujoFondoDetalleDiaFila,
} from "@/services/vencimientosPorFecha.service";

/**
 * Saldo por comprobante repartido en columnas según **fecha de vencimiento** vs **hoy (AR)**:
 * - `fecha_venc` = `fecha_comp` + plazo (override comprobante → proveedor → 30 días).
 * - **VENCIDA**: `fecha_venc` &lt; hoy
 * - **5 DÍAS**: hoy ≤ `fecha_venc` ≤ hoy+5
 * - **30 DÍAS**: hoy+6 … hoy+30
 * - **45 DÍAS**: hoy+31 … hoy+45
 * - **60 DÍAS**: `fecha_venc` ≥ hoy+46 (incluye vencimientos posteriores)
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
    WITH lineas AS (
      SELECT
        p.id_proveedor_dux AS id_proveedor_dux,
        p.nombre AS nombre,
        (c.total - c.monto_aplicado) AS saldo,
        ${Prisma.raw(SQL_FECHA_VENC_COMPROBANTE)} AS fecha_venc,
        (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS hoy
      FROM fin_compras_comprobante c
      INNER JOIN global_proveedores p ON p.id_proveedor_dux = c.id_proveedor
      WHERE c.total > c.monto_aplicado
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
      SELECT
        p.nombre AS proveedor,
        (c.total - c.monto_aplicado) AS saldo,
        c.id::text AS "comprobanteId",
        c.fecha_comp::text AS "fechaComp",
        ${Prisma.raw(SQL_FECHA_VENC_COMPROBANTE)}::text AS "fechaVenc"
      FROM fin_compras_comprobante c
      INNER JOIN global_proveedores p ON p.id_proveedor_dux = c.id_proveedor
      WHERE c.total > c.monto_aplicado
      ORDER BY p.nombre ASC, c.fecha_comp ASC, c.id ASC
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
