"use client";

/**
 * Flujo De Fondo (`/finanzas/venc-por-fecha`) — tablas con el **mismo cascarón** que
 * `TablaDeudaProveedores` / `TablaControlComprobantes` (`contenedor-tabla-gestion` → scroll →
 * `<Table variant="compact" scrollX={false}>`). Clases de datos: `celda-datos`, `TH_NUM` / `TD_NUM`.
 * Estilos de variante: `tabla-flujo-de-fondo` (primera columna a la izquierda, importes a la derecha
 * vía `globals.css`) y opcional `tabla-venc-por-fecha-alerta` + `venc-saldo-negativo` en filas.
 */

import { formatMesDiaMayusculasDesdeIsoYmd } from "@/lib/fechaArgentina";
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

function fmtMontoAr(n: number): string {
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const COL_WIDTHS_PCT_MAIN = [20, 20, 20, 20, 20] as const;
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

export interface FilaFlujoDeFondoVista {
  isoYmd: string;
  vencimientoDelDia: number;
  vtosAcumulados: number;
  cajaDisponible: number;
  saldo: number;
}

export interface TablaFlujoDeFondoProps {
  filas: FilaFlujoDeFondoVista[];
  montoVencimientoPorDia: Record<string, number>;
  haySaldoNegativo: boolean;
  onRowDoubleClick: (isoYmd: string) => void;
}

/**
 * Grilla paginada principal: cinco columnas 20% (`table-layout: fixed`), doble clic en fila = detalle.
 */
export function TablaFlujoDeFondo({
  filas,
  montoVencimientoPorDia,
  haySaldoNegativo,
  onRowDoubleClick,
}: TablaFlujoDeFondoProps) {
  return (
    <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
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
            {filas.length === 0 ? (
              <EmptyTableRow
                colSpan={5}
                message="Sin vencimientos en los próximos 150 días."
              />
            ) : (
              filas.map((fila) => (
                <TableRow
                  key={fila.isoYmd}
                  title="Doble clic para ver el detalle por proveedor"
                  onDoubleClick={() => onRowDoubleClick(fila.isoYmd)}
                  className={cn(
                    "cursor-pointer",
                    fila.saldo < 0 && "venc-saldo-negativo"
                  )}
                >
                  <TableCell
                    className={cn(
                      "celda-datos celda-destacado text-left",
                      CELL_MIN
                    )}
                  >
                    {formatMesDiaMayusculasDesdeIsoYmd(fila.isoYmd)}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, CELL_MIN)}>
                    {fmtMontoAr(montoVencimientoPorDia[fila.isoYmd] ?? 0)}
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
  );
}

export interface TablaFlujoDeFondoDetalleDiaProps {
  filas: Array<{ proveedor: string; vencimiento: number }>;
}

/**
 * Modal “Detalle del día”: **PROVEEDOR** (izq.) + **MONTO A PAGAR** (importe, derecha);
 * el scroll va en un ancestro del `Table` (misma regla que el resto de modales con tabla).
 */
export function TablaFlujoDeFondoDetalleDia({ filas }: TablaFlujoDeFondoDetalleDiaProps) {
  return (
    <div className="contenedor-tabla-gestion flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="no-scrollbar flex-1 min-h-[14rem] min-w-0 max-h-[min(28rem,70vh)] overflow-x-auto overflow-y-auto">
        <Table
          variant="compact"
          scrollX={false}
          className="tabla-flujo-de-fondo table-fixed w-full"
        >
          <ColgroupAnchos anchos={COL_WIDTHS_PCT_MODAL} />
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(CELL_MIN, "text-left")}>PROVEEDOR</TableHead>
              <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO A PAGAR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <EmptyTableRow
                colSpan={2}
                message="Sin vencimientos para el día seleccionado."
              />
            ) : (
              filas.map((fila, idx) => (
                <TableRow key={`${fila.proveedor}-${idx}`}>
                  <TableCell
                    className={cn("celda-datos max-w-[24rem] text-left celda-destacado", CELL_MIN)}
                    title={fila.proveedor}
                  >
                    <span className="block truncate">{fila.proveedor}</span>
                  </TableCell>
                  <TableCell className={cn(TD_NUM, CELL_MIN)}>
                    {fmtMontoAr(fila.vencimiento)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
