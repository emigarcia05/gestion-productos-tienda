"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatFechaLargaNotaPedidoArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";
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

/** Misma convención que `TablaDeudaProveedores` (Finanzas). */
const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

/** CAJA por día: placeholder hasta integrar origen real (mismo valor en todas las filas si es constante). */
const CAJA_DISPONIBLE_PLACEHOLDER = 0;

/**
 * Saldo acumulativo en el mes (filas ordenadas por fecha):
 * - 1.ª fila: CAJA − A PAGAR
 * - siguientes: saldo anterior − A PAGAR
 */
function filasConSaldoAcumulativo(
  filasOrdenadas: Array<{ isoYmd: string; dia: number; aPagar: number }>,
  cajaDisponiblePorFila: number
): Array<{
  isoYmd: string;
  dia: number;
  aPagar: number;
  cajaDisponible: number;
  saldo: number;
}> {
  let saldoAnterior = 0;
  return filasOrdenadas.map((fila, i) => {
    const saldo =
      i === 0
        ? cajaDisponiblePorFila - fila.aPagar
        : saldoAnterior - fila.aPagar;
    saldoAnterior = saldo;
    return {
      ...fila,
      cajaDisponible: cajaDisponiblePorFila,
      saldo,
    };
  });
}

export interface VencPorFechaCalendarioProps {
  tituloMes: string;
  mesYm: string;
  mesAnteriorYm: string;
  mesSiguienteYm: string;
  hoyIso: string;
  detallesPorDia: Record<string, Array<{ proveedor: string; vencimiento: number }>>;
  filas: Array<{
    isoYmd: string;
    dia: number;
    aPagar: number;
  }>;
}

export default function VencPorFechaCalendario({
  tituloMes,
  mesYm,
  mesAnteriorYm,
  mesSiguienteYm,
  hoyIso,
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
    () => filasConSaldoAcumulativo(filas, CAJA_DISPONIBLE_PLACEHOLDER),
    [filas]
  );

  return (
    <>
      <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 pt-1 sm:px-6 lg:px-8">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{tituloMes}</h2>
            <p className="text-xs text-muted-foreground tabular-nums">{mesYm}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
              <Link href={`/finanzas/venc-por-fecha?mes=${mesAnteriorYm}`} aria-label="Mes anterior">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
              <Link href={`/finanzas/venc-por-fecha?mes=${mesSiguienteYm}`} aria-label="Mes siguiente">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto no-scrollbar">
            <Table variant="compact" scrollX={false}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[10%] min-w-[3rem]">DÍA</TableHead>
                  <TableHead className={cn(TH_NUM, "w-[30%] min-w-[7rem]")}>A PAGAR</TableHead>
                  <TableHead className={cn(TH_NUM, "w-[30%] min-w-[7rem]")}>CAJA DISPONIBLE</TableHead>
                  <TableHead className={cn(TH_NUM, "w-[30%] min-w-[7rem]")}>SALDO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasVista.length === 0 ? (
                  <EmptyTableRow colSpan={4} message="Sin vencimientos para el mes seleccionado." />
                ) : (
                  filasVista.map((fila) => {
                    const filaPasada = fila.isoYmd < hoyIso;
                    return (
                      <TableRow
                        key={`${mesYm}-${fila.dia}`}
                        data-fecha-pasada={filaPasada ? "true" : undefined}
                        aria-label={filaPasada ? `Día ${fila.dia}, fecha pasada` : undefined}
                        title="Doble clic para ver el detalle por proveedor"
                        className={cn(
                          filaPasada &&
                            cn(
                              "cursor-default text-muted-foreground",
                              "!bg-muted/55 odd:!bg-muted/55 even:!bg-muted/55",
                              "hover:!bg-muted/62 hover:!text-muted-foreground"
                            )
                        )}
                        onDoubleClick={() => setDetalleIsoYmd(fila.isoYmd)}
                      >
                        <TableCell className="celda-datos celda-numero w-[10%] tabular-nums">{fila.dia}</TableCell>
                        <TableCell className={cn(TD_NUM, "w-[30%]")}>{fmtMonto(String(fila.aPagar))}</TableCell>
                        <TableCell className={cn(TD_NUM, "w-[30%]")}>{fmtMonto(String(fila.cajaDisponible))}</TableCell>
                        <TableCell className={cn(TD_NUM, "w-[30%]")}>{fmtMonto(String(fila.saldo))}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
            <p className="text-center text-xs text-muted-foreground">Solo lectura. Montos del día por proveedor.</p>
            <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
              <div className="min-h-[14rem] min-w-0 flex-1 overflow-x-auto overflow-y-auto no-scrollbar">
                <Table variant="compact" scrollX={false}>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[12rem] w-[65%]">PROVEEDOR</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-[7.5rem] w-[35%]")}>MONTO A PAGAR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleFilas.length === 0 ? (
                      <EmptyTableRow colSpan={2} message="Sin vencimientos para el día seleccionado." />
                    ) : (
                      detalleFilas.map((fila, idx) => (
                        <TableRow key={`${fila.proveedor}-${idx}`}>
                          <TableCell className="celda-datos w-[65%] min-w-[12rem] max-w-[24rem] text-left font-medium">
                            {fila.proveedor}
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "w-[35%]")}>{fmtMonto(String(fila.vencimiento))}</TableCell>
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
    </>
  );
}
