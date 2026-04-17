"use client";

import { useMemo, useState } from "react";
import FilterBar, {
  FILTER_SELECT_WRAPPER_CLASS,
  FilaFiltrosDesplegables,
  FilterRowSelection,
} from "@/components/FilterBar";
import AppModal from "@/components/shared/AppModal";
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

function fmtMonto(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
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

export interface VencPorFechaCalendarioProps {
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

export default function VencPorFechaCalendario({
  saldoVencidoAntesDeHoy,
  cajaDisponibleInicial,
  detallesPorDia,
  proveedoresConVencimientos,
  filas,
  paginaActual,
  totalPaginas,
  total,
}: VencPorFechaCalendarioProps) {
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
    <>
      <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 pt-1 sm:px-6 lg:px-8">
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
            </FilaFiltrosDesplegables>
          </FilterRowSelection>
        </FilterBar>

        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <Table
            variant="compact"
            scrollX={false}
            className={cn(haySaldoNegativo && "tabla-venc-por-fecha-alerta")}
          >
            {/* Cinco columnas al 20% c/u: FECHA, VENCIMIENTO DEL DÍA, VTOS ACUMULADOS, CAJA DISPONIBLE, SALDO */}
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-1/5 min-w-[6.5rem]">FECHA</TableHead>
                <TableHead className="w-1/5 min-w-[5rem]">VENCIMIENTO DEL DÍA</TableHead>
                <TableHead className="w-1/5 min-w-[5rem]">VTOS ACUMULADOS</TableHead>
                <TableHead className="w-1/5 min-w-[5rem]">CAJA DISPONIBLE</TableHead>
                <TableHead className="w-1/5 min-w-[5rem]">SALDO</TableHead>
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
                    className={cn(fila.saldo < 0 && "venc-saldo-negativo")}
                  >
                    <TableCell className="celda-datos w-1/5 text-center font-medium uppercase">
                      {formatMesDiaMayusculasDesdeIsoYmd(fila.isoYmd)}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-1/5">
                      {fmtMonto(String(vencimientoDelDiaPorFila[fila.isoYmd] ?? 0))}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-1/5">
                      {fmtMonto(String(fila.vtosAcumulados))}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-1/5">
                      {fmtMonto(String(fila.cajaDisponible))}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-1/5">
                      {fmtMonto(String(fila.saldo))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPaginas > 1 ? (
          <div className="flex justify-end pt-2 shrink-0">
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
            <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar min-h-[14rem] max-h-[min(28rem,70vh)] min-w-0 flex-1">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[12rem] w-[65%]">PROVEEDOR</TableHead>
                    <TableHead className="min-w-[7.5rem] w-[35%]">MONTO A PAGAR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalleFilas.length === 0 ? (
                    <EmptyTableRow colSpan={2} message="Sin vencimientos para el día seleccionado." />
                  ) : (
                    detalleFilas.map((fila, idx) => (
                      <TableRow key={`${fila.proveedor}-${idx}`}>
                        <TableCell className="celda-datos min-w-[12rem] max-w-[24rem] w-[65%] text-left font-medium">
                          {fila.proveedor}
                        </TableCell>
                        <TableCell className="celda-datos celda-numero w-[35%]">{fmtMonto(String(fila.vencimiento))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
