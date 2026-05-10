/**
 * Posición de IVA (Balance): débito desde `fin_bal_iva_deb` (totales declarados en UI); crédito desde
 * `fin_bal_gasto_mensual` + `fin_compras_comprobante` (facturas).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ivaCreditoDesdeTotalConIva21 } from "@/lib/ivaDesdeTotalBruto21";
import { isoFechaDevengo } from "@/services/finBalGastoMensualBalance.service";

/**
 * Valor de `fin_compras_comprobante.tipo_comp` para compras con IVA crédito (factura fiscal).
 * No confundir con la columna `comprobante`, que guarda el número de comprobante desde DUX.
 */
export const TIPO_COMP_FACTURA_IVA_CREDITO = "FACTURA" as const;

export { ivaCreditoDesdeTotalConIva21 };

function totalDecimalAPesosEnteros(total: Prisma.Decimal): number {
  const n = Number(total);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function isoYmdDesdeFechaComp(fechaComp: Date): string {
  const y = fechaComp.getUTCFullYear();
  const m = String(fechaComp.getUTCMonth() + 1).padStart(2, "0");
  const d = String(fechaComp.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Línea de detalle IVA crédito · gastos balance (`iva = true`). */
export interface DetalleLineaIvaCreditoBalance {
  id: string;
  fechaDevengoIso: string;
  gastoNombre: string;
  sucursalNombre: string;
  monto: number;
  ivaCredito: number;
}

/** Línea de detalle IVA crédito · compras mercadería (`fin_compras_comprobante`, facturas). */
export interface DetalleLineaIvaCreditoCompraMercaderia {
  id: string;
  fechaIso: string;
  proveedorNombre: string;
  monto: number;
  ivaCredito: number;
}

/**
 * Suma de IVA crédito por mes calendario (`mes` 1–12) para un año dado.
 * - `fin_bal_gasto_mensual` con `iva = true`
 * - `fin_compras_comprobante` con `tipo_comp = 'FACTURA'` (fecha según `fecha_comp`).
 */
export async function sumarIvaCreditoPorMesAnio(anio: number): Promise<number[]> {
  const totals = Array.from({ length: 12 }, () => 0);

  const [gastos, facturas] = await Promise.all([
    prisma.finBalGastoMensual.findMany({
      where: { anio, iva: true },
      select: { mes: true, monto: true },
    }),
    prisma.comprobanteProveedor.findMany({
      where: {
        tipoComp: {
          equals: TIPO_COMP_FACTURA_IVA_CREDITO,
          mode: "insensitive",
        },
        fechaComp: {
          gte: new Date(Date.UTC(anio, 0, 1)),
          lt: new Date(Date.UTC(anio + 1, 0, 1)),
        },
      },
      select: { fechaComp: true, total: true },
    }),
  ]);

  for (const r of gastos) {
    if (r.mes < 1 || r.mes > 12) continue;
    totals[r.mes - 1] += ivaCreditoDesdeTotalConIva21(r.monto);
  }

  for (const f of facturas) {
    const y = f.fechaComp.getUTCFullYear();
    const mes = f.fechaComp.getUTCMonth() + 1;
    if (y !== anio || mes < 1 || mes > 12) continue;
    const pesos = totalDecimalAPesosEnteros(f.total);
    totals[mes - 1] += ivaCreditoDesdeTotalConIva21(pesos);
  }

  return totals;
}

function rangoUtcMes(anio: number, mes: number): { inicio: Date; finExcl: Date } | null {
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) return null;
  return {
    inicio: new Date(Date.UTC(anio, mes - 1, 1)),
    finExcl: new Date(Date.UTC(anio, mes, 1)),
  };
}

/** Imputaciones del mes con `iva = true` (detalle modal Gastos). */
export async function listarDetalleIvaCreditoGastosMes(params: {
  anio: number;
  mes: number;
}): Promise<DetalleLineaIvaCreditoBalance[]> {
  const { anio, mes } = params;
  const rango = rangoUtcMes(anio, mes);
  if (!rango) return [];

  const rowsGasto = await prisma.finBalGastoMensual.findMany({
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

  return rowsGasto.map((r) => {
    const gf = r.gastoFinal;
    const fechaDevengoIso = isoFechaDevengo(anio, mes, gf.diaDevengado ?? 1);
    const sucursalDisplay = r.imputacionSucursal ?? gf.sucursal;
    return {
      id: r.id,
      fechaDevengoIso,
      gastoNombre: gf.gasto.nombre.toUpperCase(),
      sucursalNombre: sucursalDisplay?.nombre.toUpperCase() ?? "—",
      monto: r.monto,
      ivaCredito: ivaCreditoDesdeTotalConIva21(r.monto),
    };
  });
}

/** Comprobantes con `tipo_comp` factura del mes por `fecha_comp` (detalle modal Compras mercadería). */
export async function listarDetalleIvaCreditoComprasMercaderiaMes(params: {
  anio: number;
  mes: number;
}): Promise<DetalleLineaIvaCreditoCompraMercaderia[]> {
  const { anio, mes } = params;
  const rango = rangoUtcMes(anio, mes);
  if (!rango) return [];

  const { inicio, finExcl } = rango;

  const rowsFactura = await prisma.comprobanteProveedor.findMany({
    where: {
      tipoComp: {
        equals: TIPO_COMP_FACTURA_IVA_CREDITO,
        mode: "insensitive",
      },
      fechaComp: { gte: inicio, lt: finExcl },
    },
    orderBy: [{ fechaComp: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fechaComp: true,
      total: true,
      proveedor: { select: { nombre: true } },
    },
  });

  return rowsFactura.map((r) => {
    const pesos = totalDecimalAPesosEnteros(r.total);
    return {
      id: r.id,
      fechaIso: isoYmdDesdeFechaComp(r.fechaComp),
      proveedorNombre: r.proveedor.nombre.toUpperCase(),
      monto: pesos,
      ivaCredito: ivaCreditoDesdeTotalConIva21(pesos),
    };
  });
}
