"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_CLASS,
  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS,
} from "@/lib/ui-classes";
import { fmtPrecio } from "@/lib/format";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import { Banknote, Pencil, Trash2 } from "lucide-react";
import { usePieFijoColumnWidthsSync } from "@/lib/hooks/usePieFijoColumnWidthsSync";
import { useRef } from "react";

export type { BalanceGastoMensualFila };

interface Props {
  filas: BalanceGastoMensualFila[];
  /** Si hay datos crudos pero `filas` ya filtradas quedó vacío. */
  emptyMessage?: string;
  esEditor?: boolean;
  onEditarMonto?: (fila: BalanceGastoMensualFila) => void;
  onPagar?: (fila: BalanceGastoMensualFila) => void;
  onEliminar?: (fila: BalanceGastoMensualFila) => void;
}

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
/** Primera columna del bloque secundario: línea vertical #0072bb (mismo patrón que el resto de tablas). */
const TH_ACCIONES =
  "min-w-0 tabla-bloque-secundario-head-divider text-center text-[11px] font-semibold uppercase";
const TD_ACCIONES =
  "celda-datos min-w-0 bg-muted/25 text-muted-foreground tabla-bloque-secundario-cell-divider";

/** Pesos FECHA…DEVENGADO (sin ACCIONES); suman 86 — se escalan a % para la vista sin columna ACCIONES. */
const COL_WIDTHS_DATA_PCT = [8, 8, 8, 8, 15, 15, 8, 8, 8] as const;
/** FECHA…DEVENGADO + ACCIONES; suma 100. */
const COL_WIDTHS_PCT_CON_ACCIONES: readonly number[] = [...COL_WIDTHS_DATA_PCT, 14];
/** Sin ACCIONES: mismos pesos relativos que {@link COL_WIDTHS_DATA_PCT}, escalados a suma 100%. */
const COL_WIDTHS_PCT_SIN_ACCIONES: readonly number[] = COL_WIDTHS_DATA_PCT.map(
  (w) => (w * 100) / 86
);

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

export default function TablaGastos({
  filas,
  emptyMessage,
  esEditor = false,
  onEditarMonto,
  onPagar,
  onEliminar,
}: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);
  const totalPagado = filas.reduce((acc, fila) => acc + fila.pagado, 0);
  const totalPendiente = filas.reduce((acc, fila) => acc + fila.montoDevengadoPendiente, 0);
  const mostrarAcciones = esEditor && onEditarMonto && onPagar && onEliminar;
  const colCount = mostrarAcciones ? 10 : 9;
  const anchosColPct = mostrarAcciones ? COL_WIDTHS_PCT_CON_ACCIONES : COL_WIDTHS_PCT_SIN_ACCIONES;

  function celdaMonto(m: number) {
    if (m === 0) return <span className="text-muted-foreground">—</span>;
    return <>${fmtPrecio(m)}</>;
  }

  const mensajeVacio = emptyMessage ?? "No hay gastos registrados.";

  const pieScrollRef = useRef<HTMLDivElement>(null);
  const pieFooterTableRef = useRef<HTMLTableElement>(null);
  usePieFijoColumnWidthsSync(filas.length > 0, pieScrollRef, pieFooterTableRef, colCount);

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion contenedor-tabla-gestion--pie-fijo flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card">
        <div ref={pieScrollRef} className="contenedor-tabla-gestion--pie-fijo-scroll">
          {/*
            Misma envoltura que `Table` (`ui/table.tsx`): el `<table>` debe vivir en el mismo árbol que el pie
            (`div[data-slot="table-container"]` + `table.tabla-gestion-compacta`) para que el ancho útil y el
            `<colgroup>` coincidan fila a fila con la segunda tabla de totales.
          */}
          <div
            data-slot="table-container"
            className="relative min-h-0 w-full min-w-0 max-w-full"
          >
            <table
              data-slot="table"
              className={cn(
                "w-full caption-bottom text-sm tabla-gestion-compacta table-fixed w-full"
              )}
            >
              <ColgroupAnchos anchos={anchosColPct} />
              <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={CELL_MIN}>FECHA</TableHead>
                <TableHead className={CELL_MIN}>SUCURSAL</TableHead>
                <TableHead className={CELL_MIN}>TIPO GASTO</TableHead>
                <TableHead className={CELL_MIN}>RUBRO</TableHead>
                <TableHead className={CELL_MIN}>GASTO</TableHead>
                <TableHead className={CELL_MIN}>PROVEEDOR</TableHead>
                <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                <TableHead className={cn(TH_NUM, CELL_MIN)}>PAGADO</TableHead>
                <TableHead
                  className={cn(TH_NUM, CELL_MIN)}
                  title="Devengado acumulado hasta hoy menos importe ya pagado (pendiente sobre el devengado)."
                >
                  DEVENGADO
                </TableHead>
                {mostrarAcciones ? <TableHead className={TH_ACCIONES}>ACCIONES</TableHead> : null}
              </TableRow>
              </TableHeader>
              <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={colCount} message={mensajeVacio} />
              ) : (
                filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                      {formatIsoYmdDdMmYyyyArgentina(f.fechaDevengoIso)}
                    </TableCell>
                    <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                      {f.sucursalNombre}
                    </TableCell>
                    <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                      {f.tipoGastoNombre}
                    </TableCell>
                    <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                      {f.rubroNombre}
                    </TableCell>
                    <TableCell className={cn("celda-datos", CELL_MIN)} title={f.gastoNombre}>
                      <span className="celda-destacado truncate block">{f.gastoNombre}</span>
                    </TableCell>
                    <TableCell className={cn("celda-datos", CELL_MIN)} title={f.proveedorNombre}>
                      <span className="truncate block">{f.proveedorNombre}</span>
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>{celdaMonto(f.monto)}</TableCell>
                    <TableCell className={cn(TD_NUM, CELL_MIN)}>${fmtPrecio(f.pagado)}</TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
                      ${fmtPrecio(f.montoDevengadoPendiente)}
                    </TableCell>
                    {mostrarAcciones ? (
                      <TableCell className={cn(TD_ACCIONES, "p-1")}>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            className={TABLE_ROW_ICON_BUTTON_CLASS}
                            title="Editar monto"
                            aria-label={`Editar monto ${f.gastoNombre}`}
                            onClick={() => onEditarMonto!(f)}
                          >
                            <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            className={TABLE_ROW_ICON_BUTTON_CLASS}
                            title="Registrar pago"
                            aria-label={`Pagar ${f.gastoNombre}`}
                            onClick={() => onPagar!(f)}
                          >
                            <Banknote className={TABLE_ROW_ACTION_ICON_CLASS} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            className={cn(
                              TABLE_ROW_ICON_BUTTON_CLASS,
                              TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS
                            )}
                            title="Eliminar imputación"
                            aria-label={`Eliminar ${f.gastoNombre}`}
                            onClick={() => onEliminar!(f)}
                          >
                            <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
              </TableBody>
            </table>
          </div>
        </div>

        {filas.length > 0 ? (
          <div className="contenedor-tabla-gestion--pie-fijo-pie">
            <div
              data-slot="table-container"
              className="relative min-h-0 w-full min-w-0 max-w-full"
            >
              <table
                ref={pieFooterTableRef}
                data-slot="table"
                className="w-full caption-bottom text-sm tabla-gestion-compacta table-fixed w-full"
              >
                <ColgroupAnchos anchos={anchosColPct} />
                <tbody>
                <tr className="transition-[background-color] duration-150">
                  <td
                    className={cn("celda-datos font-bold uppercase whitespace-nowrap", CELL_MIN)}
                    colSpan={6}
                  >
                    TOTAL
                  </td>
                  <td className={cn(TD_NUM, "celda-datos celda-destacado font-bold whitespace-nowrap", CELL_MIN)}>
                    {totalMonto === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>${fmtPrecio(totalMonto)}</>
                    )}
                  </td>
                  <td className={cn(TD_NUM, "celda-datos font-bold whitespace-nowrap", CELL_MIN)}>
                    ${fmtPrecio(totalPagado)}
                  </td>
                  <td className={cn(TD_NUM, "celda-datos celda-destacado font-bold whitespace-nowrap", CELL_MIN)}>
                    ${fmtPrecio(totalPendiente)}
                  </td>
                  {mostrarAcciones ? (
                    <td className={cn(TD_ACCIONES, "whitespace-nowrap")} aria-hidden />
                  ) : null}
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
