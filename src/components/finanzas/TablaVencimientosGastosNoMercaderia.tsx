"use client";

import { cn } from "@/lib/utils";
import type { ProveedorNoMercaderiaObligacionVencidaFila } from "@/services/finBalGastoMensualBalance.service";
import {
  EmptyTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

function fmtMontoAr(n: number): string {
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface TablaVencimientosGastosNoMercaderiaProps {
  filas: ProveedorNoMercaderiaObligacionVencidaFila[];
  onProveedorDoubleClick: (proveedor: string) => void;
}

/**
 * Proveedores **no** mercadería con obligación de gasto de balance vencida (total pendiente a hoy).
 * Doble clic en fila → detalle (misma tabla que Flujo de Fondo).
 */
export default function TablaVencimientosGastosNoMercaderia({
  filas,
  onProveedorDoubleClick,
}: TablaVencimientosGastosNoMercaderiaProps) {
  const totalGeneral =
    filas.length > 0 ? filas.reduce((s, f) => s + f.totalVencido, 0) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4 px-6 px-8">
      <p
        className={cn(
          "shrink-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        )}
        aria-live="polite"
      >
        {`${filas.length.toLocaleString("es-AR")} PROVEEDOR${filas.length === 1 ? "" : "ES"} CON OBLIGACIÓN VENCIDA`}
      </p>
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false} className="table-fixed w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[14rem] w-[65%]">PROVEEDOR</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[8rem] w-[35%]")}>TOTAL VENCIDO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow
                  colSpan={2}
                  message="NO HAY PROVEEDORES NO MERCADERÍA CON OBLIGACIONES VENCIDAS."
                />
              ) : (
                filas.map((f) => (
                  <TableRow
                    key={f.proveedor}
                    title="DOBLE CLIC PARA VER DETALLE DE VENCIMIENTOS"
                    className="cursor-pointer select-none hover:bg-primary/5"
                    onDoubleClick={() => onProveedorDoubleClick(f.proveedor)}
                  >
                    <TableCell
                      className="celda-datos min-w-[14rem] max-w-[32rem] font-medium celda-destacado"
                      title={f.proveedor}
                    >
                      <span className="block truncate">{f.proveedor}</span>
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado")}>
                      {fmtMontoAr(f.totalVencido)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {filas.length > 0 ? (
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground text-right">
          TOTAL GENERAL VENCIDO:{" "}
          <span className="font-semibold text-foreground">{fmtMontoAr(totalGeneral)}</span>
        </p>
      ) : null}
    </div>
  );
}
