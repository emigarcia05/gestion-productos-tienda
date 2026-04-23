"use client";

import { useMemo, useState } from "react";
import FilterBar, {
  FILTER_COUNT_CLASS,
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FilaFiltrosDesplegables,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import {
  TablaFlujoDeFondo,
  TablaFlujoDeFondoDetalleDia,
} from "@/components/finanzas/TablaFlujoDeFondo";
import AppModal from "@/components/shared/AppModal";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatFechaLargaNotaPedidoArgentina } from "@/lib/fechaArgentina";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { FlujoFondoDetalleDiaFila } from "@/services/vencimientosPorFecha.service";

/**
 * Filas ordenadas por fecha (calendario completo en servidor: hoy → hoy+150 inclusive):
 * - **VTOS ACUMULADOS**: saldo ya vencido antes de hoy (todas las fechas) + suma corrida del vencimiento de cada día en la tabla.
 * - **CAJA DISPONIBLE**: primera fila toma la suma inicial de cajas de tesorería; desde la segunda,
 *   toma el saldo de la fila anterior si es positivo (si no, 0).
 * - **SALDO**: siempre `CAJA DISPONIBLE - VTOS ACUMULADOS`.
 */
function filasConVtosYSaldo(
  filasOrdenadas: Array<{
    isoYmd: string;
    vencimientoDelDia: number;
  }>,
  cajaDisponibleInicial: number,
  saldoVencidoAntesDeHoy: number
): Array<{
  isoYmd: string;
  vencimientoDelDia: number;
  vtosAcumulados: number;
  cajaDisponible: number;
  saldo: number;
}> {
  let vtosAcum = saldoVencidoAntesDeHoy;
  let saldoAnterior = 0;
  return filasOrdenadas.map((fila, index) => {
    vtosAcum += fila.vencimientoDelDia;
    const cajaDisponible = index === 0 ? cajaDisponibleInicial : Math.max(0, saldoAnterior);
    const saldo = cajaDisponible - vtosAcum;
    saldoAnterior = saldo;
    return {
      ...fila,
      vtosAcumulados: vtosAcum,
      cajaDisponible,
      saldo,
    };
  });
}

export interface FinanzasVencPorFechaPageClientProps {
  /**
   * Suma de **pendiente** vencido antes de hoy: comprobantes (`sumarSaldoVencimientosConFechaVencAnteriorA`)
   * + **monto devengado pendiente a hoy** de imputaciones de balance con venc &lt; hoy.
   */
  saldoVencidoAntesDeHoy: number;
  /** Suma de montos de cajas tesorería para la primera fila de la grilla. */
  cajaDisponibleInicial: number;
  detallesPorDia: Record<string, FlujoFondoDetalleDiaFila[]>;
  proveedoresConVencimientos: string[];
  filas: Array<{
    isoYmd: string;
    vencimientoDelDia: number;
  }>;
  paginaActual: number;
  totalPaginas: number;
  total: number;
}

export default function FinanzasVencPorFechaPageClient({
  saldoVencidoAntesDeHoy,
  cajaDisponibleInicial,
  detallesPorDia,
  proveedoresConVencimientos,
  filas,
  paginaActual,
  totalPaginas,
  total,
}: FinanzasVencPorFechaPageClientProps) {
  const [detalleIsoYmd, setDetalleIsoYmd] = useState<string | null>(null);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const detalleFilas = useMemo(() => {
    if (!detalleIsoYmd) return [];
    const base = detallesPorDia[detalleIsoYmd] ?? [];
    if (!filtroProveedor) return base;
    return base.filter((f) => f.proveedor === filtroProveedor);
  }, [detalleIsoYmd, detallesPorDia, filtroProveedor]);
  const detalleFechaLarga = useMemo(() => {
    if (!detalleIsoYmd) return "";
    const [yy, mm, dd] = detalleIsoYmd.split("-").map(Number);
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return "";
    return formatFechaLargaNotaPedidoArgentina(new Date(yy, mm - 1, dd));
  }, [detalleIsoYmd]);

  const filasVista = useMemo(
    () =>
      filasConVtosYSaldo(filas, cajaDisponibleInicial, saldoVencidoAntesDeHoy),
    [filas, cajaDisponibleInicial, saldoVencidoAntesDeHoy]
  );
  const montoVencimientoPorDia = useMemo(() => {
    if (!filtroProveedor) {
      return Object.fromEntries(filas.map((fila) => [fila.isoYmd, fila.vencimientoDelDia]));
    }
    const porDia: Record<string, number> = {};
    for (const fila of filas) {
      const detalleDia = detallesPorDia[fila.isoYmd] ?? [];
      porDia[fila.isoYmd] = detalleDia
        .filter((d) => d.proveedor === filtroProveedor)
        .reduce((s, d) => s + d.monto, 0);
    }
    return porDia;
  }, [detallesPorDia, filas, filtroProveedor]);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Flujo De Fondo"
        className="min-h-0 flex-1"
        contentWidth="full"
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection>
              <FilaFiltrosDesplegables>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select
                    value={filtroProveedor || "none"}
                    onValueChange={(valor) => setFiltroProveedor(valor === "none" ? "" : valor)}
                  >
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="PROVEEDOR" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">PROVEEDOR</SelectItem>
                      {proveedoresConVencimientos.map((proveedor) => (
                        <SelectItem key={proveedor} value={proveedor}>
                          {proveedor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-4")}>
                  <LimpiarFiltrosButton
                    visible={!!filtroProveedor}
                    onClick={() => setFiltroProveedor("")}
                  />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-2 pb-4">
          <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p
              className={cn(
                "text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              )}
              aria-live="polite"
            >
              <span className={FILTER_COUNT_CLASS}>
                {filasVista.length.toLocaleString("es-AR")}
              </span>
              {` DÍA${filasVista.length === 1 ? "" : "S"} EN ESTA PÁGINA`}
              {totalPaginas > 1 ? (
                <span className="font-normal normal-case text-muted-foreground">
                  {" "}
                  · Pág. {paginaActual} / {totalPaginas}
                </span>
              ) : null}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground sm:text-right">
              Ventana: {total.toLocaleString("es-AR")} día{total === 1 ? "" : "s"} (hoy + 150)
            </p>
          </div>

          <TablaFlujoDeFondo
            filas={filasVista}
            montoVencimientoPorDia={montoVencimientoPorDia}
            onRowDoubleClick={setDetalleIsoYmd}
          />

          {totalPaginas > 1 ? (
            <div className="flex shrink-0 justify-end pt-2">
              <PaginacionTabla
                basePath="/finanzas/venc-por-fecha"
                params={{}}
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                total={total}
                pageSize={PAGE_SIZE}
              />
            </div>
          ) : null}
        </div>
      </ClassicFilteredTableLayout>

      <Dialog open={detalleIsoYmd !== null} onOpenChange={(open) => !open && setDetalleIsoYmd(null)}>
        <AppModal
          title={
            detalleFechaLarga ? (
              <span className="flex flex-col items-center gap-1 text-center">
                <span>Detalle Del Día</span>
                <span className="text-sm font-normal text-primary-foreground/95">{detalleFechaLarga}</span>
              </span>
            ) : (
              "Detalle Del Día"
            )
          }
          size="lg"
          padding="sm"
          scrollBody={false}
          actions={
            <Button type="button" variant="outline" onClick={() => setDetalleIsoYmd(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <TablaFlujoDeFondoDetalleDia filas={detalleFilas} />
          </div>
        </AppModal>
      </Dialog>
    </div>
  );
}
