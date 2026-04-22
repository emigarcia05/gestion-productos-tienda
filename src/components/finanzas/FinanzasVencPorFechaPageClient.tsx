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
import AppModal from "@/components/shared/AppModal";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  formatFechaLargaNotaPedidoArgentina,
  formatMesDiaMayusculasDesdeIsoYmd,
} from "@/lib/fechaArgentina";
import {
  EmptyTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function fmtMontoAr(n: number): string {
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
  /** Suma de saldos con `fecha_venc` &lt; hoy (incluye comprobantes no mostrados en la ventana). */
  saldoVencidoAntesDeHoy: number;
  /** Suma de montos de cajas tesorería para la primera fila de la grilla. */
  cajaDisponibleInicial: number;
  detallesPorDia: Record<string, Array<{ proveedor: string; vencimiento: number }>>;
  proveedoresConVencimientos: string[];
  filas: Array<{
    isoYmd: string;
    vencimientoDelDia: number;
  }>;
  paginaActual: number;
  totalPaginas: number;
  total: number;
}

/** Cinco columnas al 20% (misma proporción que documentación del módulo). */
const COL_WIDTHS_PCT_MAIN = [20, 20, 20, 20, 20] as const;
/** Modal detalle: proveedor / monto. */
const COL_WIDTHS_PCT_MODAL = [65, 35] as const;

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

function ColgroupAnchos({ anchos }: { anchos: readonly number[] }) {
  return (
    <colgroup>
      {anchos.map((pct, i) => (
        <col key={i} style={{ width: `${pct}%` }} />
      ))}
    </colgroup>
  );
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
  const detalleFilas = useMemo(
    () => (detalleIsoYmd ? detallesPorDia[detalleIsoYmd] ?? [] : []),
    [detalleIsoYmd, detallesPorDia]
  );
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
  const vencimientoDelDiaPorFila = useMemo(() => {
    if (!filtroProveedor) {
      return Object.fromEntries(filas.map((fila) => [fila.isoYmd, fila.vencimientoDelDia]));
    }
    const porDia: Record<string, number> = {};
    for (const fila of filas) {
      const detalleDia = detallesPorDia[fila.isoYmd] ?? [];
      const detalleProveedor = detalleDia.find((d) => d.proveedor === filtroProveedor);
      porDia[fila.isoYmd] = detalleProveedor?.vencimiento ?? 0;
    }
    return porDia;
  }, [detallesPorDia, filas, filtroProveedor]);
  const haySaldoNegativo = useMemo(
    () => filasVista.some((fila) => fila.saldo < 0),
    [filasVista]
  );

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

          <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
              <Table
                variant="compact"
                scrollX={false}
                className={cn(
                  "tabla-flujo-de-fondo table-fixed w-full",
                  haySaldoNegativo && "tabla-venc-por-fecha-alerta"
                )}
              >
                <ColgroupAnchos anchos={COL_WIDTHS_PCT_MAIN} />
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(CELL_MIN, "text-left")}>FECHA</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>VENCIMIENTO DEL DÍA</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>VTOS ACUMULADOS</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>CAJA DISPONIBLE</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>SALDO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filasVista.length === 0 ? (
                    <EmptyTableRow
                      colSpan={5}
                      message="Sin vencimientos en los próximos 150 días."
                    />
                  ) : (
                    filasVista.map((fila) => (
                      <TableRow
                        key={fila.isoYmd}
                        title="Doble clic para ver el detalle por proveedor"
                        onDoubleClick={() => setDetalleIsoYmd(fila.isoYmd)}
                        className={cn(
                          "cursor-pointer",
                          fila.saldo < 0 && "venc-saldo-negativo"
                        )}
                      >
                        <TableCell
                          className={cn(
                            "celda-datos celda-destacado font-medium uppercase text-left",
                            CELL_MIN
                          )}
                        >
                          {formatMesDiaMayusculasDesdeIsoYmd(fila.isoYmd)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>
                          {fmtMontoAr(vencimientoDelDiaPorFila[fila.isoYmd] ?? 0)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>
                          {fmtMontoAr(fila.vtosAcumulados)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>
                          {fmtMontoAr(fila.cajaDisponible)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
                          {fmtMontoAr(fila.saldo)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

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
            <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
              <div className="no-scrollbar flex-1 min-h-[14rem] max-h-[min(28rem,70vh)] min-w-0 overflow-x-auto overflow-y-auto">
                <Table variant="compact" scrollX={false} className="tabla-flujo-de-fondo table-fixed w-full">
                  <ColgroupAnchos anchos={COL_WIDTHS_PCT_MODAL} />
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(CELL_MIN, "text-left")}>PROVEEDOR</TableHead>
                      <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO A PAGAR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleFilas.length === 0 ? (
                      <EmptyTableRow colSpan={2} message="Sin vencimientos para el día seleccionado." />
                    ) : (
                      detalleFilas.map((fila, idx) => (
                        <TableRow key={`${fila.proveedor}-${idx}`}>
                          <TableCell
                            className={cn(
                              "celda-datos max-w-[24rem] text-left font-medium celda-destacado",
                              CELL_MIN
                            )}
                            title={fila.proveedor}
                          >
                            <span className="block truncate">{fila.proveedor}</span>
                          </TableCell>
                          <TableCell className={cn(TD_NUM, CELL_MIN)}>{fmtMontoAr(fila.vencimiento)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </AppModal>
      </Dialog>
    </div>
  );
}
