"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
  const detalleDia = detalleIsoYmd ? Number(detalleIsoYmd.slice(8, 10)) : null;

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

        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[10%]">DÍA</TableHead>
                <TableHead className="w-[30%]">A PAGAR</TableHead>
                <TableHead className="w-[30%]">CAJA DISPONIBLE</TableHead>
                <TableHead className="w-[30%]">SALDO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={4} message="Sin vencimientos para el mes seleccionado." />
              ) : (
                filas.map((fila) => {
                  const cajaDisponible = 0;
                  const saldo = cajaDisponible - fila.aPagar;
                  const estaVencida = fila.isoYmd < hoyIso;
                  return (
                    <TableRow
                      key={`${mesYm}-${fila.dia}`}
                      className={estaVencida ? "bg-muted/60 text-muted-foreground opacity-70" : undefined}
                      onDoubleClick={() => setDetalleIsoYmd(fila.isoYmd)}
                    >
                      <TableCell className="celda-datos celda-numero w-[10%]">{fila.dia}</TableCell>
                      <TableCell className="celda-datos celda-numero w-[30%]">
                        {fmtMonto(String(fila.aPagar))}
                      </TableCell>
                      <TableCell className="celda-datos celda-numero w-[30%]">
                        {fmtMonto(String(cajaDisponible))}
                      </TableCell>
                      <TableCell className="celda-datos celda-numero w-[30%]">
                        {fmtMonto(String(saldo))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={detalleIsoYmd !== null} onOpenChange={(open) => !open && setDetalleIsoYmd(null)}>
        <AppModal
          title={`Vencimientos Del Día ${detalleDia ?? ""}`}
          size="lg"
          padding="sm"
          scrollBody={false}
          actions={
            <Button variant="outline" onClick={() => setDetalleIsoYmd(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="contenedor-tabla-gestion no-scroll-x h-full min-h-[18rem]">
            <Table variant="compact" scrollX={false}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[70%]">PROVEEDOR</TableHead>
                  <TableHead className="w-[30%]">VENCIMIENTO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalleFilas.length === 0 ? (
                  <EmptyTableRow colSpan={2} message="Sin vencimientos para el día seleccionado." />
                ) : (
                  detalleFilas.map((fila, idx) => (
                    <TableRow key={`${fila.proveedor}-${idx}`}>
                      <TableCell className="celda-datos w-[70%] text-left">{fila.proveedor}</TableCell>
                      <TableCell className="celda-datos celda-numero w-[30%]">
                        {fmtMonto(String(fila.vencimiento))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
