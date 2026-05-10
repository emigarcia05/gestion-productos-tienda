/**
 * Posición de IVA (Balance): lecturas sobre `fin_bal_gasto_mensual` y derivados.
 */
import { prisma } from "@/lib/prisma";
import { isoFechaDevengo } from "@/services/finBalGastoMensualBalance.service";

/** Monto bruto con IVA 21 % implícito en la fórmula acordada (`monto / 1.21` = neto gravado). */
const DIVISOR_NETO_CON_IVA = 1.21 as const;

/**
 * IVA crédito fiscal por línea: `monto - (monto / 1.21)` con redondeo al peso entero.
 * Solo aplica cuando la imputación discrimina IVA (`iva = true` en BD).
 */
export function ivaCreditoDesdeMontoImputacionConIva21(monto: number): number {
  if (!Number.isFinite(monto) || monto <= 0) return 0;
  return Math.round(monto - monto / DIVISOR_NETO_CON_IVA);
}

/**
 * Suma de IVA crédito por mes calendario (`mes` 1–12) para un año dado.
 * Incluye solo filas `fin_bal_gasto_mensual` con `iva = true`.
 */
export async function sumarIvaCreditoPorMesAnio(anio: number): Promise<number[]> {
  const totals = Array.from({ length: 12 }, () => 0);
  const rows = await prisma.finBalGastoMensual.findMany({
    where: { anio, iva: true },
    select: { mes: true, monto: true },
  });
  for (const r of rows) {
    if (r.mes < 1 || r.mes > 12) continue;
    totals[r.mes - 1] += ivaCreditoDesdeMontoImputacionConIva21(r.monto);
  }
  return totals;
}

/** Línea de detalle para modal «IVA Crédito» (imputaciones con `iva = true` en un mes). */
export interface DetalleLineaIvaCreditoBalance {
  id: string;
  fechaDevengoIso: string;
  gastoNombre: string;
  sucursalNombre: string;
  monto: number;
  ivaCredito: number;
}

/**
 * Listado de imputaciones del mes con discrimina IVA, para desglose de crédito fiscal.
 */
export async function listarDetalleIvaCreditoMes(params: {
  anio: number;
  mes: number;
}): Promise<DetalleLineaIvaCreditoBalance[]> {
  const { anio, mes } = params;
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) return [];

  const rows = await prisma.finBalGastoMensual.findMany({
    where: { anio, mes, iva: true },
    orderBy: [{ createdAt: "asc" }],
    include: {
      imputacionSucursal: { select: { nombre: true } },
      gastoFinal: {
        select: {
          diaDevengado: true,
          sucursal: { select: { nombre: true } },
          gasto: { select: { nombre: true } },
        },
      },
    },
  });

  return rows.map((r) => {
    const gf = r.gastoFinal;
    const fechaDevengoIso = isoFechaDevengo(anio, mes, gf.diaDevengado ?? 1);
    const sucursalDisplay = r.imputacionSucursal ?? gf.sucursal;
    return {
      id: r.id,
      fechaDevengoIso,
      gastoNombre: gf.gasto.nombre.toUpperCase(),
      sucursalNombre: sucursalDisplay?.nombre.toUpperCase() ?? "—",
      monto: r.monto,
      ivaCredito: ivaCreditoDesdeMontoImputacionConIva21(r.monto),
    };
  });
}
