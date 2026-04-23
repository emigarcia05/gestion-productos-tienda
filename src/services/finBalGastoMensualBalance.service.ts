/**
 * Imputaciones mensuales de gastos de balance (`fin_bal_gasto_mensual`)
 * para la pantalla `/finanzas/balance/gastos`.
 */
import { prisma } from "@/lib/prisma";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types/service.types";
import type { FlujoFondoDetalleDiaFila } from "@/services/vencimientosPorFecha.service";
import { ordenarDetallesFlujoDia } from "@/services/vencimientosPorFecha.service";

export interface BalanceGastoMensualFila {
  id: string;
  /** FK `fin_bal_gasto_final`. */
  gastoFinalId: string;
  /** Fecha de devengo (mes/año de la fila + día devengado del catálogo). */
  fechaDevengoIso: string;
  sucursalNombre: string;
  tipoGastoNombre: string;
  rubroNombre: string;
  gastoNombre: string;
  /** Comentarios del `fin_bal_gasto_final` (gasto + proveedor + sucursal), si hay. */
  gastoFinalComentarios: string | null;
  proveedorNombre: string;
  monto: number;
  pagado: number;
  /**
   * Pendiente de pago sobre el devengado acumulado a la fecha: `max(0, devengadoAcumulado − pagado)`.
   * El proporcional usa solo **`monto` del mes de la fila**; si es 0, el devengado es 0.
   */
  montoDevengadoPendiente: number;
  /** Mismo día del mes calendario siguiente al devengo (ej. 01/04/2026 → 01/05/2026). ISO `yyyy-mm-dd`. */
  fechaVencimientoIso: string;
  /** Si hoy (AR) ≥ fecha de vencimiento: pendiente de pago `max(0, monto - pagado)`; si no, 0. */
  montoVencido: number;
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

/**
 * Cantidad de días calendario **desde** la fecha de devengo **hasta** hoy (AR), **ambas inclusive**
 * (ej.: devengo día 1 y hoy día 21 del mismo mes → **21** para multiplicar el gasto diario).
 * Si hoy &lt; devengo → 0.
 */
export function diasDesdeDevengoHastaHoy(isoDevengo: string, isoHoyArgentina: string): number {
  if (isoHoyArgentina < isoDevengo) return 0;
  const t0 = parseIsoYmdUtcNoon(isoDevengo);
  const t1 = parseIsoYmdUtcNoon(isoHoyArgentina);
  const diffDias = Math.floor((t1 - t0) / 86400000);
  return diffDias + 1;
}

/**
 * Fecha en que el gasto **vence**: mismo día del mes calendario siguiente al devengo
 * (ej. devengo **01/04/2026** → vencimiento **01/05/2026**). ISO `yyyy-mm-dd` (mediodía UTC interno).
 */
export function fechaVencimientoGastoBalanceDesdeDevengoIso(isoDevengo: string): string {
  const [y, m, d] = isoDevengo.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  t.setUTCMonth(t.getUTCMonth() + 1);
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function montoVencidoGastoBalance(params: {
  isoHoyArgentina: string;
  isoDevengo: string;
  monto: number;
  pagado: number;
}): number {
  const isoVenc = fechaVencimientoGastoBalanceDesdeDevengoIso(params.isoDevengo);
  if (params.isoHoyArgentina < isoVenc) return 0;
  return Math.max(0, params.monto - params.pagado);
}

function computePendiente(params: {
  valorMensualReferencia: number;
  diasMes: number;
  diasTranscurridos: number;
}): number {
  const { valorMensualReferencia, diasMes, diasTranscurridos } = params;
  if (valorMensualReferencia <= 0 || diasMes <= 0 || diasTranscurridos <= 0) return 0;
  const diario = valorMensualReferencia / diasMes;
  const proporcional = Math.round(diario * diasTranscurridos);
  /** No supera el monto mensual de referencia: el devengado acumula hasta ese tope. */
  return Math.min(proporcional, valorMensualReferencia);
}

/**
 * Pendiente de pago sobre devengado, con devengado acumulado **hasta** `isoCorte` (día del venc o hoy en cartera).
 * Misma fórmula que la columna **DEVENGADO** en `/finanzas/balance/gastos`.
 * Solo usa el **monto imputado en ese mes calendario**; si es `0`, no hay devengado (no se hereda el mes anterior).
 */
export function montoDevengadoPendienteHastaCorte(
  params: {
    isoDevengo: string;
    isoCorte: string;
    mesImputacion: number;
    anioImputacion: number;
    monto: number;
    pagado: number;
  }
): number {
  const { isoDevengo, isoCorte, mesImputacion, anioImputacion, monto, pagado } = params;
  if (isoCorte < isoDevengo) return 0;
  const diasMes = diasEnMesCalendario(anioImputacion, mesImputacion);
  const diasT = diasDesdeDevengoHastaHoy(isoDevengo, isoCorte);
  const valor = monto > 0 ? monto : 0;
  const devengadoAcum = computePendiente({
    valorMensualReferencia: valor,
    diasMes,
    diasTranscurridos: diasT,
  });
  return Math.max(0, devengadoAcum - pagado);
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

/**
 * Listado del mes: imputaciones con jerarquía de gasto, proveedor y sucursal.
 * **Devengado acumulado (hasta hoy AR):** **mínimo** entre `monto` del mes (si &gt; 0) y el redondeo proporcional por días desde devengo a hoy.
 * Si el **monto del mes es 0**, no hay devengado en ese mes (no se usa el monto de meses anteriores).
 * **`montoDevengadoPendiente`** (UI columna **DEVENGADO**): **`max(0, devengadoAcumulado − pagado)`** — pendiente de pago sobre ese devengado.
 * `fechaVencimientoIso` / `montoVencido`: vence el mismo día del mes siguiente al devengo; si hoy (AR) ≥ esa fecha, `montoVencido = max(0, monto - pagado)`.
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

  return rows.map((r) => {
    const gf = r.gastoFinal;
    const fechaDevengoIso = isoFechaDevengo(anio, mes, gf.diaDevengado);
    const diasT = diasDesdeDevengoHastaHoy(fechaDevengoIso, isoHoy);
    const montoActual = r.monto;
    const valor = montoActual > 0 ? montoActual : 0;
    const devengadoAcumuladoAHoy = computePendiente({
      valorMensualReferencia: valor,
      diasMes,
      diasTranscurridos: diasT,
    });
    const montoDevengadoPendiente = Math.max(0, devengadoAcumuladoAHoy - r.pagado);
    const fechaVencimientoIso = fechaVencimientoGastoBalanceDesdeDevengoIso(fechaDevengoIso);
    const montoVencido = montoVencidoGastoBalance({
      isoHoyArgentina: isoHoy,
      isoDevengo: fechaDevengoIso,
      monto: montoActual,
      pagado: r.pagado,
    });

    const comRaw = gf.comentarios?.trim() ?? "";
    const gastoFinalComentarios = comRaw.length > 0 ? comRaw.toUpperCase() : null;

    return {
      id: r.id,
      gastoFinalId: r.gastoFinalId,
      fechaDevengoIso,
      sucursalNombre: gf.sucursal.nombre.toUpperCase(),
      tipoGastoNombre: gf.gasto.rubro.tipo.nombre.toUpperCase(),
      rubroNombre: gf.gasto.rubro.nombre.toUpperCase(),
      gastoNombre: gf.gasto.nombre.toUpperCase(),
      gastoFinalComentarios,
      proveedorNombre: gf.proveedor.nombre.toUpperCase(),
      monto: montoActual,
      pagado: r.pagado,
      montoDevengadoPendiente,
      fechaVencimientoIso,
      montoVencido,
    };
  });
}

/** Ítem del catálogo `fin_bal_gasto_final` con `gasto_mensual = false` (gasto único). */
export interface FinBalGastoFinalNoMensualListItem {
  gastoFinalId: string;
  tipoGastoNombre: string;
  rubroNombre: string;
  gastoNombre: string;
  proveedorNombre: string;
  sucursalNombre: string;
  diaDevengado: number;
  gastoFinalComentarios: string | null;
  /** Si ya existe `fin_bal_gasto_mensual` para este gasto final y el periodo (mes, año). */
  yaImputadoEnPeriodo: boolean;
}

/**
 * Gastos finales no mensuales del catálogo, con indicador de si ya hay imputación en `(mes, anio)`.
 */
export async function listarGastosFinalesNoMensualesConEstadoPeriodo(params: {
  mes: number;
  anio: number;
}): Promise<FinBalGastoFinalNoMensualListItem[]> {
  const { mes, anio } = params;

  const [finals, imputadas] = await Promise.all([
    prisma.finBalGastoFinal.findMany({
      where: { gastoMensual: false },
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
    }),
    prisma.finBalGastoMensual.findMany({
      where: { mes, anio },
      select: { gastoFinalId: true },
    }),
  ]);

  const ya = new Set(imputadas.map((i) => i.gastoFinalId));

  const rows: FinBalGastoFinalNoMensualListItem[] = finals.map((gf) => {
    const comRaw = gf.comentarios?.trim() ?? "";
    return {
      gastoFinalId: gf.id,
      tipoGastoNombre: gf.gasto.rubro.tipo.nombre.toUpperCase(),
      rubroNombre: gf.gasto.rubro.nombre.toUpperCase(),
      gastoNombre: gf.gasto.nombre.toUpperCase(),
      proveedorNombre: gf.proveedor.nombre.toUpperCase(),
      sucursalNombre: gf.sucursal.nombre.toUpperCase(),
      diaDevengado: gf.diaDevengado,
      gastoFinalComentarios: comRaw.length > 0 ? comRaw.toUpperCase() : null,
      yaImputadoEnPeriodo: ya.has(gf.id),
    };
  });

  rows.sort((a, b) => {
    const t = a.tipoGastoNombre.localeCompare(b.tipoGastoNombre, "es");
    if (t !== 0) return t;
    const r = a.rubroNombre.localeCompare(b.rubroNombre, "es");
    if (r !== 0) return r;
    const g = a.gastoNombre.localeCompare(b.gastoNombre, "es");
    if (g !== 0) return g;
    const p = a.proveedorNombre.localeCompare(b.proveedorNombre, "es");
    if (p !== 0) return p;
    return a.sucursalNombre.localeCompare(b.sucursalNombre, "es");
  });

  return rows;
}

/**
 * Crea una fila `fin_bal_gasto_mensual` para un gasto final con `gasto_mensual = false`
 * (imputación puntual del periodo).
 */
export async function crearImputacionGastoUnicoBalance(params: {
  gastoFinalId: string;
  mes: number;
  anio: number;
  monto: number;
  pagado: number;
}): Promise<ServiceResult<{ id: string }>> {
  const { gastoFinalId, mes, anio, monto, pagado } = params;
  if (monto < 1) {
    return { success: false, error: "El monto es obligatorio y debe ser mayor a cero." };
  }
  if (pagado < 0 || pagado > monto) {
    return { success: false, error: "El importe pagado debe estar entre 0 y el monto." };
  }
  try {
    const gf = await prisma.finBalGastoFinal.findUnique({
      where: { id: gastoFinalId },
      select: { id: true, gastoMensual: true },
    });
    if (!gf) {
      return { success: false, error: "Gasto no encontrado en el catálogo." };
    }
    if (gf.gastoMensual) {
      return {
        success: false,
        error: "Este gasto está configurado como mensual; usá «Cargar Mes».",
      };
    }
    const dupe = await prisma.finBalGastoMensual.findUnique({
      where: {
        gastoFinalId_mes_anio: { gastoFinalId, mes, anio },
      },
      select: { id: true },
    });
    if (dupe) {
      return {
        success: false,
        error: "Este gasto único ya tiene imputación en el periodo seleccionado.",
      };
    }
    const row = await prisma.finBalGastoMensual.create({
      data: { gastoFinalId, mes, anio, monto, pagado },
      select: { id: true },
    });
    return { success: true, data: { id: row.id } };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return {
        success: false,
        error: "Este gasto único ya tiene imputación en el periodo seleccionado.",
      };
    }
    const msg = e instanceof Error ? e.message : "No se pudo crear la imputación.";
    return { success: false, error: msg };
  }
}

const includeGastoFlujoGastoMensual = {
  gastoFinal: {
    include: {
      proveedor: { select: { nombre: true, proveedorMercaderia: true } },
      gasto: { select: { nombre: true } },
    },
  },
} as const;

/** Línea de vencimiento de imputación de balance (Flujo de Fondo, detalle y columna). */
export interface VencimientoGastoFlujoLinea {
  imputacionId: string;
  fechaVenc: string;
  /** Proveedor (catálogo balance), para filtro y grilla. */
  proveedor: string;
  /** Nombre de gasto en catálogo (MAYÚSCULAS, como en Balance). */
  detalle: string;
  monto: number;
  devengoIso: string;
}

/**
 * Suma de **monto devengado pendiente a hoy** de imputaciones cuya fecha de vencimiento (desde
 * devengo) es **&lt; `fechaIso`**, con la misma fórmula que {@link montoDevengadoPendienteHastaCorte}.
 * Sirve con **VTOS ACUMULADOS** junto a comprobantes.
 */
export async function sumarPendienteGastosConFechaVencAnteriorA(
  fechaIso: string
): Promise<number> {
  const hoyCorte = fechaIso;
  const all = await prisma.finBalGastoMensual.findMany({
    include: includeGastoFlujoGastoMensual,
  });
  if (all.length === 0) return 0;
  let suma = 0;
  for (const r of all) {
    const gf = r.gastoFinal;
    const fechaDevengoIso = isoFechaDevengo(r.anio, r.mes, gf.diaDevengado);
    const fechaVenc = fechaVencimientoGastoBalanceDesdeDevengoIso(fechaDevengoIso);
    if (fechaVenc >= hoyCorte) continue;
    const pend = montoDevengadoPendienteHastaCorte({
      isoDevengo: fechaDevengoIso,
      isoCorte: hoyCorte,
      mesImputacion: r.mes,
      anioImputacion: r.anio,
      monto: r.monto,
      pagado: r.pagado,
    });
    suma += pend;
  }
  return suma;
}

/**
 * Imputaciones cuyo vencimiento entra en `[desde, hasta]`, con **monto a vencer** = devengado
 * pendiente a la **fecha de vencimiento** (corte = `fechaVenc`).
 */
export async function listarVencimientosGastoFlujoEnRango(
  fechaDesde: string,
  fechaHasta: string
): Promise<VencimientoGastoFlujoLinea[]> {
  const all = await prisma.finBalGastoMensual.findMany({
    include: includeGastoFlujoGastoMensual,
  });
  if (all.length === 0) return [];
  const out: VencimientoGastoFlujoLinea[] = [];
  for (const r of all) {
    const gf = r.gastoFinal;
    const fechaDevengoIso = isoFechaDevengo(r.anio, r.mes, gf.diaDevengado);
    const fechaVenc = fechaVencimientoGastoBalanceDesdeDevengoIso(fechaDevengoIso);
    if (fechaVenc < fechaDesde || fechaVenc > fechaHasta) continue;
    const montoPendVenc = montoDevengadoPendienteHastaCorte({
      isoDevengo: fechaDevengoIso,
      isoCorte: fechaVenc,
      mesImputacion: r.mes,
      anioImputacion: r.anio,
      monto: r.monto,
      pagado: r.pagado,
    });
    if (montoPendVenc <= 0) continue;
    out.push({
      imputacionId: r.id,
      fechaVenc,
      proveedor: gf.proveedor.nombre.toUpperCase(),
      detalle: gf.gasto.nombre.toUpperCase(),
      monto: montoPendVenc,
      devengoIso: fechaDevengoIso,
    });
  }
  return out;
}

/** Proveedor (nombre en MAYÚSCULAS) no mercadería con suma de obligaciones de gasto ya vencidas. */
export interface ProveedorNoMercaderiaObligacionVencidaFila {
  proveedor: string;
  totalVencido: number;
}

/**
 * Obligaciones de balance (imputaciones mensuales) **ya vencidas** (`fecha_venc` &lt; hoy AR),
 * pendiente a hoy &gt; 0, solo si el proveedor del gasto final **no** es mercadería (`proveedorMercaderia === false`).
 *
 * - `detalleLineas`: filas compatibles con {@link TablaFlujoDeFondoDetalleDia} / Flujo de Fondo.
 * - `proveedores`: agregado por proveedor, orden alfabético.
 */
export async function listarObligacionesGastoVencidasNoMercaderia(): Promise<{
  hoyIso: string;
  proveedores: ProveedorNoMercaderiaObligacionVencidaFila[];
  detalleLineas: FlujoFondoDetalleDiaFila[];
}> {
  const hoyIso = dateToIsoYmdArgentina(new Date());
  const all = await prisma.finBalGastoMensual.findMany({
    include: includeGastoFlujoGastoMensual,
  });
  if (all.length === 0) {
    return { hoyIso, proveedores: [], detalleLineas: [] };
  }

  const detalleLineas: FlujoFondoDetalleDiaFila[] = [];
  const totales = new Map<string, number>();

  for (const r of all) {
    const gf = r.gastoFinal;
    if (gf.proveedor.proveedorMercaderia) continue;

    const fechaDevengoIso = isoFechaDevengo(r.anio, r.mes, gf.diaDevengado);
    const fechaVenc = fechaVencimientoGastoBalanceDesdeDevengoIso(fechaDevengoIso);
    if (fechaVenc >= hoyIso) continue;

    const pend = montoDevengadoPendienteHastaCorte({
      isoDevengo: fechaDevengoIso,
      isoCorte: hoyIso,
      mesImputacion: r.mes,
      anioImputacion: r.anio,
      monto: r.monto,
      pagado: r.pagado,
    });
    if (pend <= 0) continue;

    const proveedor = gf.proveedor.nombre.toUpperCase();
    detalleLineas.push({
      proveedor,
      detalle: gf.gasto.nombre.toUpperCase(),
      monto: pend,
      sortFecha: fechaDevengoIso,
      sortId: r.id,
    });
    totales.set(proveedor, (totales.get(proveedor) ?? 0) + pend);
  }

  const proveedores: ProveedorNoMercaderiaObligacionVencidaFila[] = [...totales.entries()]
    .map(([proveedor, totalVencido]) => ({ proveedor, totalVencido }))
    .sort((a, b) => a.proveedor.localeCompare(b.proveedor, "es"));

  return {
    hoyIso,
    proveedores,
    detalleLineas: ordenarDetallesFlujoDia(detalleLineas),
  };
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

export async function actualizarPagadoFinBalGastoMensual(params: {
  id: string;
  pagado: number;
}): Promise<ServiceResult<{ id: string; pagado: number }>> {
  const { id, pagado } = params;
  try {
    const current = await prisma.finBalGastoMensual.findUnique({
      where: { id },
      select: { monto: true },
    });
    if (!current) {
      return { success: false, error: "Imputación no encontrada." };
    }
    if (pagado > current.monto) {
      return {
        success: false,
        error: "El importe pagado no puede superar el monto imputado.",
      };
    }
    const row = await prisma.finBalGastoMensual.update({
      where: { id },
      data: { pagado },
      select: { id: true, pagado: true },
    });
    return { success: true, data: { id: row.id, pagado: row.pagado } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo registrar el pago.";
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
