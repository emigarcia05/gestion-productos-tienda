"use client";

/**
 * Flujo De Fondo (`/finanzas/venc-por-fecha`) — tablas con el **mismo cascarón** que
 * `TablaDeudaProveedores` / `TablaControlComprobantes` (`contenedor-tabla-gestion` → scroll →
 * `<Table variant="compact" scrollX={false}>`). Clase `tabla-flujo-de-fondo`: columna **FECHA**
 * centrada; importes con `TD_NUM`. **SALDO** negativo: `text-destructive font-semibold` en la celda.
 */

import {
  formatIsoYmdDdMmYyyyArgentina,
  formatMesDiaMayusculasDesdeIsoYmd,
} from "@/lib/fechaArgentina";
import type { FilaFlujoDeFondoCalculada } from "@/lib/flujoDeFondoFilas";
import { cn } from "@/lib/utils";
import type { FlujoFondoDetalleDiaFila } from "@/services/vencimientosPorFecha.service";
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

const COL_WIDTH_CLASSES_MAIN = ["w-[25%]", "w-[25%]", "w-[25%]", "w-[25%]"] as const;
const COL_WIDTH_CLASSES_MODAL = [
  "w-[14%]",
  "w-[14%]",
  "w-[24%]",
  "w-[28%]",
  "w-[20%]",
] as const;

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

function ColgroupAnchos({ anchos }: { anchos: readonly string[] }) {
  return (
    <colgroup>
      {anchos.map((cls, i) => (
        <col key={i} className={cls} />
      ))}
    </colgroup>
  );
}

export type FilaFlujoDeFondoVista = FilaFlujoDeFondoCalculada;

export interface TablaFlujoDeFondoProps {
  filas: FilaFlujoDeFondoVista[];
  montoVencimientoPorDia: Record<string, number>;
  onRowDoubleClick: (isoYmd: string) => void;
}

/**
 * Grilla paginada principal: cuatro columnas 25% (`table-layout: fixed`), doble clic en fila = detalle.
 */
export function TablaFlujoDeFondo({
  filas,
  montoVencimientoPorDia,
  onRowDoubleClick,
}: TablaFlujoDeFondoProps) {
  return (
    <div className="contenedor-tabla-gestion overflow-hidden">
      <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
        <Table
          variant="compact"
          scrollX={false}
          className="tabla-flujo-de-fondo table-fixed w-full"
        >
          <ColgroupAnchos anchos={COL_WIDTH_CLASSES_MAIN} />
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={CELL_MIN}>FECHA</TableHead>
              <TableHead className={cn(TH_NUM, CELL_MIN)}>VENCIMIENTO DEL DÍA</TableHead>
              <TableHead className={cn(TH_NUM, CELL_MIN)}>CAJA DISPONIBLE</TableHead>
              <TableHead className={cn(TH_NUM, CELL_MIN)}>SALDO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <EmptyTableRow
                colSpan={4}
                message="Sin vencimientos en los próximos 150 días."
              />
            ) : (
              filas.map((fila) => (
                <TableRow
                  key={fila.isoYmd}
                  title="Doble clic para abrir el detalle del día (proveedores, detalle, montos)"
                  onDoubleClick={() => onRowDoubleClick(fila.isoYmd)}
                  className="cursor-pointer"
                >
                  <TableCell
                    className={cn("celda-datos celda-destacado text-center", CELL_MIN)}
                  >
                    {formatMesDiaMayusculasDesdeIsoYmd(fila.isoYmd)}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, CELL_MIN)}>
                    {fmtMontoAr(montoVencimientoPorDia[fila.isoYmd] ?? 0)}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, CELL_MIN)}>
                    {fmtMontoAr(fila.cajaDisponible)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      TD_NUM,
                      "celda-destacado",
                      fila.saldo < 0 && "text-destructive font-semibold",
                      CELL_MIN
                    )}
                  >
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
  filas: FlujoFondoDetalleDiaFila[];
  /**
   * Texto de fila vacía (`EmptyTableRow`). Por defecto: detalle por día en Flujo de Fondo.
   * En **Venc. Provee. Gastos** pasar mensaje acorde al filtro por proveedor.
   */
  emptyMessage?: string;
}

/**
 * Modal “Detalle del día”: **FECHA DEVENGADA** + **FECHA VENCIMIENTO** + **PROVEEDOR** + **DETALLE** + **MONTO**;
 * el scroll va en un ancestro del `Table` (misma regla que el resto de modales con tabla).
 */
export function TablaFlujoDeFondoDetalleDia({
  filas,
  emptyMessage = "Sin vencimientos para el día seleccionado.",
}: TablaFlujoDeFondoDetalleDiaProps) {
  return (
    <div className="contenedor-tabla-gestion max-h-full overflow-hidden">
      <div className="no-scrollbar flex-1 min-h-[14rem] min-w-0 max-h-[min(28rem,70vh)] overflow-x-auto overflow-y-auto">
        <Table
          variant="compact"
          scrollX={false}
          className="tabla-flujo-de-fondo table-fixed w-full"
        >
          <ColgroupAnchos anchos={COL_WIDTH_CLASSES_MODAL} />
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(CELL_MIN, "text-center")}>FECHA DEVENGADA</TableHead>
              <TableHead className={cn(CELL_MIN, "text-center")}>FECHA VENCIMIENTO</TableHead>
              <TableHead className={CELL_MIN}>PROVEEDOR</TableHead>
              <TableHead className={CELL_MIN}>DETALLE</TableHead>
              <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <EmptyTableRow colSpan={5} message={emptyMessage} />
            ) : (
              filas.map((fila) => (
                <TableRow key={fila.sortId}>
                  <TableCell className={cn("celda-datos text-center tabular-nums", CELL_MIN)}>
                    {formatIsoYmdDdMmYyyyArgentina(fila.fechaDevengadaIso)}
                  </TableCell>
                  <TableCell className={cn("celda-datos text-center tabular-nums", CELL_MIN)}>
                    {formatIsoYmdDdMmYyyyArgentina(fila.fechaVencimientoIso)}
                  </TableCell>
                  <TableCell
                    className={cn("celda-datos max-w-[14rem] text-left celda-destacado", CELL_MIN)}
                    title={fila.proveedor}
                  >
                    <span className="block truncate">{fila.proveedor}</span>
                  </TableCell>
                  <TableCell
                    className={cn("celda-datos max-w-[18rem] text-left", CELL_MIN)}
                    title={fila.detalle}
                  >
                    <span className="block truncate">{fila.detalle}</span>
                  </TableCell>
                  <TableCell className={cn(TD_NUM, CELL_MIN)}>
                    {fmtMontoAr(fila.monto)}
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
