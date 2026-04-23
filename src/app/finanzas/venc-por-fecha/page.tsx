import { redirect } from "next/navigation";
import FinanzasVencPorFechaPageClient from "@/components/finanzas/FinanzasVencPorFechaPageClient";
import {
  addDaysToIsoYmdArgentina,
  dateToIsoYmdArgentina,
} from "@/lib/fechaArgentina";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  FLUJO_FONDO_DETALLE_MERCADERIA,
  listarVencimientosEnRango,
  ordenarDetallesFlujoDia,
  type FlujoFondoDetalleDiaFila,
  sumarSaldoVencimientosConFechaVencAnteriorA,
} from "@/services/vencimientosPorFecha.service";
import {
  listarVencimientosGastoFlujoEnRango,
  sumarPendienteGastosConFechaVencAnteriorA,
} from "@/services/finBalGastoMensualBalance.service";
import { listarCajasTesoreria } from "@/services/cajasTesoreria.service";
import { sumarMontosChequesDiferidosPorFechaAcreditacion } from "@/services/finTesoreriaCheques.service";
import type { FilaFlujoDeFondoVista } from "@/components/finanzas/TablaFlujoDeFondo";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";

export const dynamic = "force-dynamic";

/** Ventana fija: desde hoy (AR) hasta 150 días adelante (inclusive). */
const DIAS_VENTANA_VENC_POR_FECHA = 150;

function claveDiaFechaVenc(fechaVenc: string | Date): string {
  if (typeof fechaVenc === "string") {
    return fechaVenc.length >= 10 ? fechaVenc.slice(0, 10) : fechaVenc;
  }
  return dateToIsoYmdArgentina(fechaVenc);
}

function sortFechaCompToIso(fechaComp: string): string {
  return fechaComp.length >= 10 ? fechaComp.slice(0, 10) : fechaComp;
}

interface Props {
  searchParams: Promise<{
    pagina?: string;
  }>;
}

export default async function VencPorFechaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const { pagina = "1" } = await searchParams;
  const paginaSolicitada = Math.max(1, parseInt(pagina, 10) || 1);

  const hoyIso = dateToIsoYmdArgentina(new Date());
  const hastaIso = addDaysToIsoYmdArgentina(hoyIso, DIAS_VENTANA_VENC_POR_FECHA);

  const [
    lineasCompra,
    lineasGasto,
    saldoComprasAntes,
    saldoGastosAntes,
    cajasTesoreria,
    incrementosChequePorFecha,
  ] = await Promise.all([
    listarVencimientosEnRango(hoyIso, hastaIso),
    listarVencimientosGastoFlujoEnRango(hoyIso, hastaIso),
    sumarSaldoVencimientosConFechaVencAnteriorA(hoyIso),
    sumarPendienteGastosConFechaVencAnteriorA(hoyIso),
    listarCajasTesoreria(),
    sumarMontosChequesDiferidosPorFechaAcreditacion(hoyIso),
  ]);
  const saldoVencidoAntesDeHoy = saldoComprasAntes + saldoGastosAntes;

  const cajaDisponibleInicial = cajasTesoreria.reduce(
    (acc, caja) => acc + Number(caja.montoDisponible || 0),
    0
  );

  const totalPorDia: Record<string, number> = {};
  const acumDetalle: Record<string, FlujoFondoDetalleDiaFila[]> = {};

  for (const l of lineasCompra) {
    const key = claveDiaFechaVenc(l.fechaVenc);
    if (key < hoyIso || key > hastaIso) continue;
    const m = Number(l.saldo);
    totalPorDia[key] = (totalPorDia[key] ?? 0) + m;
    if (!acumDetalle[key]) acumDetalle[key] = [];
    acumDetalle[key].push({
      proveedor: l.nombre.trim().toUpperCase(),
      detalle: FLUJO_FONDO_DETALLE_MERCADERIA,
      monto: m,
      sortFecha: sortFechaCompToIso(l.fechaComp),
      sortId: l.comprobanteId,
    });
  }

  for (const g of lineasGasto) {
    const key = g.fechaVenc;
    totalPorDia[key] = (totalPorDia[key] ?? 0) + g.monto;
    if (!acumDetalle[key]) acumDetalle[key] = [];
    acumDetalle[key].push({
      proveedor: g.proveedor,
      detalle: g.detalle,
      monto: g.monto,
      sortFecha: g.devengoIso,
      sortId: g.imputacionId,
    });
  }

  const detallesPorDia: Record<string, FlujoFondoDetalleDiaFila[]> = Object.fromEntries(
    Object.entries(acumDetalle).map(([isoYmd, filas]) => [isoYmd, ordenarDetallesFlujoDia(filas)])
  );

  const filasTotales: Array<{ isoYmd: string; vencimientoDelDia: number }> = [];
  for (
    let iso = hoyIso;
    iso <= hastaIso;
    iso = addDaysToIsoYmdArgentina(iso, 1)
  ) {
    filasTotales.push({
      isoYmd: iso,
      vencimientoDelDia: totalPorDia[iso] ?? 0,
    });
  }

  /** Liquidez extra por cheques diferidos incorporada hasta cada día (inclusive). */
  const liquidoChequesDiferidosHasta = new Map<string, number>();
  let acumChequesDif = 0;
  for (const { isoYmd } of filasTotales) {
    acumChequesDif += incrementosChequePorFecha.get(isoYmd) ?? 0;
    liquidoChequesDiferidosHasta.set(isoYmd, acumChequesDif);
  }

  let vtosAcum = saldoVencidoAntesDeHoy;
  let saldoAnterior = 0;
  const filasCompletas: FilaFlujoDeFondoVista[] = filasTotales.map((fila, i) => {
    vtosAcum += fila.vencimientoDelDia;
    const liquidoDia =
      cajaDisponibleInicial + (liquidoChequesDiferidosHasta.get(fila.isoYmd) ?? 0);
    /** Liquidez proyectada (tesorería + cheques que liquidan ese día) vs. saldo previo si era favorable. */
    const cajaDisponible =
      i === 0
        ? liquidoDia
        : Math.max(liquidoDia, Math.max(0, saldoAnterior));
    const saldo = cajaDisponible - vtosAcum;
    saldoAnterior = saldo;
    return {
      isoYmd: fila.isoYmd,
      vencimientoDelDia: fila.vencimientoDelDia,
      vtosAcumulados: vtosAcum,
      cajaDisponible,
      saldo,
    };
  });

  const total = filasCompletas.length;
  const totalPaginas = totalPaginasFromTotal(total, PAGE_SIZE);
  const paginaActual = Math.min(paginaSolicitada, totalPaginas);
  const inicio = skipForPagina(paginaActual, PAGE_SIZE);
  const filas = filasCompletas.slice(inicio, inicio + PAGE_SIZE);

  const nombresProveedores = new Set<string>();
  for (const l of lineasCompra) nombresProveedores.add(l.nombre.trim().toUpperCase());
  for (const g of lineasGasto) nombresProveedores.add(g.proveedor);
  const proveedoresConVencimientos = [...nombresProveedores].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <FinanzasVencPorFechaPageClient
        detallesPorDia={detallesPorDia}
        proveedoresConVencimientos={proveedoresConVencimientos}
        filas={filas}
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        total={total}
      />
    </div>
  );
}
