/**
 * Imputaciones mensuales de gastos de balance (`fin_bal_gasto_mensual`)
 * para la pantalla `/finanzas/balance/gastos`.
 */
import { prisma } from "@/lib/prisma";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types/service.types";

export interface BalanceGastoMensualFila {
  id: string;
  /** FK `fin_bal_gasto_final` (para repetir último monto del mes calendario anterior). */
  gastoFinalId: string;
  /** Fecha de devengo (mes/año de la fila + día devengado del catálogo). */
  fechaDevengoIso: string;
  sucursalNombre: string;
  tipoGastoNombre: string;
  rubroNombre: string;
  gastoNombre: string;
  proveedorNombre: string;
  monto: number;
  pagado: number;
  montoDevengadoPendiente: number;
}

/** Días del mes calendario (1–12). Abril → 30. */
export function diasEnMesCalendario(anio: number, mes1a12: number): number {
  return new Date(anio, mes1a12, 0).getDate();
}

function isoFechaDevengo(anio: number, mes: number, diaDevengado: number): string {
  const maxD = diasEnMesCalendario(anio, mes);
  const d = Math.min(Math.max(1, diaDevengado), maxD);
  const mm = String(mes).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${anio}-${mm}-${dd}`;
}

function parseIsoYmdUtcNoon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0);
}

/** Días completos transcurridos desde la fecha de devengo hasta hoy (calendario AR). Si hoy < devengo → 0. */
export function diasDesdeDevengoHastaHoy(isoDevengo: string, isoHoyArgentina: string): number {
  if (isoHoyArgentina < isoDevengo) return 0;
  const t0 = parseIsoYmdUtcNoon(isoDevengo);
  const t1 = parseIsoYmdUtcNoon(isoHoyArgentina);
  return Math.round((t1 - t0) / 86400000);
}

function computePendiente(params: {
  valorMensualReferencia: number;
  diasMes: number;
  diasTranscurridos: number;
}): number {
  const { valorMensualReferencia, diasMes, diasTranscurridos } = params;
  if (valorMensualReferencia <= 0 || diasMes <= 0 || diasTranscurridos <= 0) return 0;
  const diario = valorMensualReferencia / diasMes;
  return Math.round(diario * diasTranscurridos);
}

/** Mes y año calendario en Argentina (instante actual). */
export function mesAnioCalendarioArgentina(ahora: Date = new Date()): { mes: number; anio: number } {
  const ymd = dateToIsoYmdArgentina(ahora);
  const [y, m] = ymd.split("-").map(Number);
  return { mes: m, anio: y };
}

/** Mes calendario inmediatamente anterior a `(mes, anio)` (ej. abr → mar; ene → dic año-1). */
export function mesAnteriorCalendario(mes: number, anio: number): { mes: number; anio: number } {
  if (mes <= 1) return { mes: 12, anio: anio - 1 };
  return { mes: mes - 1, anio };
}

/**
 * Crea filas `fin_bal_gasto_mensual` (monto 0, pagado 0) para el mes/año dado,
 * por cada `fin_bal_gasto_final` con `gasto_mensual = true` que aún no tenga fila.
 */
export async function cargarImputacionesMensualesDesdeCatalogo(params: {
  mes: number;
  anio: number;
}): Promise<ServiceResult<{ creados: number; yaExistentes: number }>> {
  const { mes, anio } = params;
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    return { success: false, error: "Mes o año inválido." };
  }

  try {
    const finals = await prisma.finBalGastoFinal.findMany({
      where: { gastoMensual: true },
      select: { id: true },
    });
    if (finals.length === 0) {
      return { success: true, data: { creados: 0, yaExistentes: 0 } };
    }

    const existentes = await prisma.finBalGastoMensual.findMany({
      where: { mes, anio, gastoFinalId: { in: finals.map((f) => f.id) } },
      select: { gastoFinalId: true },
    });
    const ya = new Set(existentes.map((e) => e.gastoFinalId));
    const aCrear = finals.filter((f) => !ya.has(f.id));

    if (aCrear.length === 0) {
      return { success: true, data: { creados: 0, yaExistentes: finals.length } };
    }

    await prisma.$transaction(
      aCrear.map((f) =>
        prisma.finBalGastoMensual.create({
          data: {
            gastoFinalId: f.id,
            mes,
            anio,
            monto: 0,
            pagado: 0,
          },
        })
      )
    );

    return {
      success: true,
      data: { creados: aCrear.length, yaExistentes: ya.size },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al cargar imputaciones mensuales.";
    return { success: false, error: msg };
  }
}

/** Mayor (anio, mes) estrictamente anterior a (anio, mes), por gasto final. */
async function mapaMontoReferenciaPrior(
  gastoFinalIds: string[],
  mes: number,
  anio: number
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (gastoFinalIds.length === 0) return out;

  const targetKey = anio * 100 + mes;
  const historicos = await prisma.finBalGastoMensual.findMany({
    where: {
      gastoFinalId: { in: gastoFinalIds },
      OR: [{ anio: { lt: anio } }, { AND: [{ anio }, { mes: { lt: mes } }] }],
    },
    select: { gastoFinalId: true, mes: true, anio: true, monto: true },
  });

  const best = new Map<string, { key: number; monto: number }>();
  for (const h of historicos) {
    const k = h.anio * 100 + h.mes;
    if (k >= targetKey) continue;
    const cur = best.get(h.gastoFinalId);
    if (!cur || k > cur.key) {
      best.set(h.gastoFinalId, { key: k, monto: h.monto });
    }
  }
  for (const [id, v] of best) {
    out.set(id, v.monto);
  }
  return out;
}

/**
 * Listado del mes: imputaciones con jerarquía de gasto, proveedor y sucursal.
 * `montoDevengadoPendiente`: (valor / días del mes) × días desde devengo hasta hoy (AR).
 * **Valor:** `monto` del mes actual si &gt; 0; si no, último `monto` de un mes anterior.
 */
/** Años y meses que existen en `fin_bal_gasto_mensual` (al menos una fila). */
export interface PeriodosImputacionesDisponibles {
  /** Años distintos, orden descendente (más reciente primero). */
  anios: number[];
  /** Clave `String(anio)` → meses 1–12 presentes en DB para ese año, orden ascendente. */
  mesesPorAnio: Record<string, number[]>;
}

/**
 * Lista años y meses que aparecen en `fin_bal_gasto_mensual` (sin inventar periodos).
 * Si la tabla está vacía, devuelve `{ anios: [], mesesPorAnio: {} }`.
 */
export async function listarPeriodosConImputacionesEnDb(): Promise<PeriodosImputacionesDisponibles> {
  const groups = await prisma.finBalGastoMensual.groupBy({
    by: ["anio", "mes"],
    orderBy: [{ anio: "asc" }, { mes: "asc" }],
  });
  const mesesPorAnio: Record<string, number[]> = {};
  for (const g of groups) {
    const k = String(g.anio);
    if (!mesesPorAnio[k]) mesesPorAnio[k] = [];
    mesesPorAnio[k].push(g.mes);
  }
  for (const k of Object.keys(mesesPorAnio)) {
    mesesPorAnio[k].sort((a, b) => a - b);
  }
  const anios = [...new Set(groups.map((g) => g.anio))].sort((a, b) => b - a);
  return { anios, mesesPorAnio };
}

export async function listarImputacionesMensualesBalance(params: {
  mes: number;
  anio: number;
}): Promise<BalanceGastoMensualFila[]> {
  const { mes, anio } = params;
  const isoHoy = dateToIsoYmdArgentina(new Date());
  const diasMes = diasEnMesCalendario(anio, mes);

  const rows = await prisma.finBalGastoMensual.findMany({
    where: { mes, anio },
    orderBy: [{ createdAt: "asc" }],
    include: {
      gastoFinal: {
        include: {
          sucursal: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
          gasto: {
            select: {
              nombre: true,
              rubro: {
                select: {
                  nombre: true,
                  tipo: { select: { nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const ids = rows.map((r) => r.gastoFinalId);
  const priorMonto = await mapaMontoReferenciaPrior(ids, mes, anio);

  return rows.map((r) => {
    const gf = r.gastoFinal;
    const fechaDevengoIso = isoFechaDevengo(anio, mes, gf.diaDevengado);
    const diasT = diasDesdeDevengoHastaHoy(fechaDevengoIso, isoHoy);
    const montoActual = r.monto;
    const valor = montoActual > 0 ? montoActual : (priorMonto.get(gf.id) ?? 0);
    const montoDevengadoPendiente = computePendiente({
      valorMensualReferencia: valor,
      diasMes,
      diasTranscurridos: diasT,
    });

    return {
      id: r.id,
      gastoFinalId: r.gastoFinalId,
      fechaDevengoIso,
      sucursalNombre: gf.sucursal.nombre.toUpperCase(),
      tipoGastoNombre: gf.gasto.rubro.tipo.nombre.toUpperCase(),
      rubroNombre: gf.gasto.rubro.nombre.toUpperCase(),
      gastoNombre: gf.gasto.nombre.toUpperCase(),
      proveedorNombre: gf.proveedor.nombre.toUpperCase(),
      monto: montoActual,
      pagado: r.pagado,
      montoDevengadoPendiente,
    };
  });
}

/**
 * `monto` persistido en el **mes calendario inmediatamente anterior** a `(mes, anio)`
 * para el mismo `gasto_final_id`. Si no hay fila en ese mes, devuelve `null`.
 */
export async function obtenerMontoImputacionMesAnterior(params: {
  gastoFinalId: string;
  mes: number;
  anio: number;
}): Promise<number | null> {
  const { gastoFinalId, mes, anio } = params;
  const prev = mesAnteriorCalendario(mes, anio);
  const row = await prisma.finBalGastoMensual.findUnique({
    where: {
      gastoFinalId_mes_anio: {
        gastoFinalId,
        mes: prev.mes,
        anio: prev.anio,
      },
    },
    select: { monto: true },
  });
  return row?.monto ?? null;
}

export async function actualizarMontoFinBalGastoMensual(params: {
  id: string;
  monto: number;
}): Promise<ServiceResult<{ id: string; monto: number }>> {
  const { id, monto } = params;
  try {
    const current = await prisma.finBalGastoMensual.findUnique({
      where: { id },
      select: { pagado: true },
    });
    if (!current) {
      return { success: false, error: "Imputación no encontrada." };
    }
    if (monto < current.pagado) {
      return {
        success: false,
        error: "El monto no puede ser menor al importe ya pagado.",
      };
    }
    const row = await prisma.finBalGastoMensual.update({
      where: { id },
      data: { monto },
      select: { id: true, monto: true },
    });
    return { success: true, data: { id: row.id, monto: row.monto } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo actualizar el monto.";
    return { success: false, error: msg };
  }
}

export async function eliminarFinBalGastoMensual(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalGastoMensual.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo eliminar la imputación.";
    return { success: false, error: msg };
  }
}
