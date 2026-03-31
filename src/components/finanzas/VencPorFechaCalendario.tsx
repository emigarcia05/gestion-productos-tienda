import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  filas: Array<{
    dia: number;
    aPagar: number;
  }>;
}

export default function VencPorFechaCalendario({
  tituloMes,
  mesYm,
  mesAnteriorYm,
  mesSiguienteYm,
  filas,
}: VencPorFechaCalendarioProps) {
  return (
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
              <TableHead className="w-[20%]">MES</TableHead>
              <TableHead className="w-[5%]">DÍA</TableHead>
              <TableHead className="w-[25%]">A PAGAR</TableHead>
              <TableHead className="w-[25%]">CAJA DISPONIBLE</TableHead>
              <TableHead className="w-[25%]">SALDO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <EmptyTableRow colSpan={5} message="Sin vencimientos para el mes seleccionado." />
            ) : (
              filas.map((fila) => {
                const cajaDisponible = 0;
                const saldo = cajaDisponible - fila.aPagar;
                return (
                  <TableRow key={`${mesYm}-${fila.dia}`}>
                    <TableCell className="celda-datos w-[20%]">{tituloMes}</TableCell>
                    <TableCell className="celda-datos celda-numero w-[5%]">{fila.dia}</TableCell>
                    <TableCell className="celda-datos celda-numero w-[25%]">
                      {fmtMonto(String(fila.aPagar))}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-[25%]">
                      {fmtMonto(String(cajaDisponible))}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero w-[25%]">
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
  );
}
