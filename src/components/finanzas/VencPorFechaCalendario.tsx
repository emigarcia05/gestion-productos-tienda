"use client";

import { useMemo, useState } from "react";
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

function fmtMonto(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** CAJA por día: placeholder hasta integrar origen real (mismo valor en todas las filas si es constante). */
const CAJA_DISPONIBLE_PLACEHOLDER = 0;

/**
 * Filas ordenadas por fecha (solo ≥ hoy en servidor):
 * - **VTOS ACUMULADOS**: suma corrida de vencimiento del día.
 * - **SALDO**: 1.ª fila CAJA − vencimiento del día; siguientes: saldo anterior − vencimiento del día.
 */
function filasConVtosYSaldo(
  filasOrdenadas: Array<{
    isoYmd: string;
    vencimientoDelDia: number;
  }>,
  cajaDisponiblePorFila: number
): Array<{
  isoYmd: string;
  vencimientoDelDia: number;
  vtosAcumulados: number;
  cajaDisponible: number;
  saldo: number;
}> {
  let saldoAnterior = 0;
  let vtosAcum = 0;
  return filasOrdenadas.map((fila, i) => {
    vtosAcum += fila.vencimientoDelDia;
    const saldo =
      i === 0
        ? cajaDisponiblePorFila - fila.vencimientoDelDia
        : saldoAnterior - fila.vencimientoDelDia;
    saldoAnterior = saldo;
    return {
      ...fila,
      vtosAcumulados: vtosAcum,
      cajaDisponible: cajaDisponiblePorFila,
      saldo,
    };
  });
}

export interface VencPorFechaCalendarioProps {
  rangoDesdeLabel: string;
  rangoHastaLabel: string;
  detallesPorDia: Record<string, Array<{ proveedor: string; vencimiento: number }>>;
  filas: Array<{
    isoYmd: string;
    vencimientoDelDia: number;
  }>;
}

export default function VencPorFechaCalendario({
  rangoDesdeLabel,
  rangoHastaLabel,
  detallesPorDia,
  filas,
}: VencPorFechaCalendarioProps) {
  const [detalleIsoYmd, setDetalleIsoYmd] = useState<string | null>(null);
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
    () => filasConVtosYSaldo(filas, CAJA_DISPONIBLE_PLACEHOLDER),
    [filas]
  );

  return (
    <>
      <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 pt-1 sm:px-6 lg:px-8">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Próximos 150 días</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {rangoDesdeLabel} — {rangoHastaLabel}
            </p>
          </div>
        </div>

        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <Table variant="compact" scrollX={false}>
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
                  >
                    <TableCell className="celda-datos w-1/5 text-center font-medium uppercase">
                      {formatMesDiaMayusculasDesdeIsoYmd(fila.isoYmd)}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-1/5">
                      {fmtMonto(String(fila.vencimientoDelDia))}
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
