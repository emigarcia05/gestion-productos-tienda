"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtPrecio } from "@/lib/format";
import { Pencil, TriangleAlert, Trash2 } from "lucide-react";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_CLASS,
  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS,
  TEXT_WARNING_CLASS,
} from "@/lib/ui-classes";
import { usePieFijoColumnWidthsSync } from "@/lib/hooks/usePieFijoColumnWidthsSync";
import { useRef } from "react";

export interface TesoreriaCajaFila {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: string;
  monto: number;
  ultActualizacion: string;
  ultActualizacionIso: string;
}
interface Props {
  filas: TesoreriaCajaFila[];
  esEditor?: boolean;
  onRowDoubleClick?: (fila: TesoreriaCajaFila) => void;
  onEditDataClick?: (fila: TesoreriaCajaFila) => void;
  onDeleteClick?: (fila: TesoreriaCajaFila) => void;
}

const COLS = 5;

/** Ancho relativo por columna; suma 100 (con/sin ACCIONES). */
const COL_WIDTHS_PCT_CON_ACCIONES = [18, 18, 12, 12, 22, 18] as const;
const COL_WIDTHS_PCT_SIN_ACCIONES = [22, 22, 14, 14, 28] as const;

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";
const MS_POR_DIA = 1000 * 60 * 60 * 24;

function getDiasSinActualizar(ultActualizacionIso: string): number | null {
  const timestamp = Date.parse(ultActualizacionIso);
  if (Number.isNaN(timestamp)) return null;
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / MS_POR_DIA);
}

function ColgroupAnchos({ anchos }: { anchos: readonly number[] }) {
  return (
    <colgroup>
      {anchos.map((pct, i) => (
        <col key={i} style={{ width: `${pct}%` }} />
      ))}
    </colgroup>
  );
}

export default function TablaTesoreriaCajas({
  filas,
  esEditor = false,
  onRowDoubleClick,
  onEditDataClick,
  onDeleteClick,
}: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);
  const colCount = esEditor ? COLS + 1 : COLS;
  const anchosColPct = esEditor ? COL_WIDTHS_PCT_CON_ACCIONES : COL_WIDTHS_PCT_SIN_ACCIONES;

  const pieScrollRef = useRef<HTMLDivElement>(null);
  const pieFooterTableRef = useRef<HTMLTableElement>(null);
  usePieFijoColumnWidthsSync(filas.length > 0, pieScrollRef, pieFooterTableRef, colCount);

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion contenedor-tabla-gestion--pie-fijo flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div ref={pieScrollRef} className="contenedor-tabla-gestion--pie-fijo-scroll">
          <Table variant="compact" scrollX={false} className="table-fixed w-full">
            <ColgroupAnchos anchos={anchosColPct} />
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={CELL_MIN}>CAJA</TableHead>
                <TableHead className={CELL_MIN}>TITULAR</TableHead>
                <TableHead className={CELL_MIN}>TIPO CAJA</TableHead>
                <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                <TableHead className={cn("tabla-bloque-secundario-head-divider", CELL_MIN)}>
                  ÚLT. ACTUALIZACIÓN
                </TableHead>
                {esEditor ? (
                  <TableHead className={cn("text-center tabla-bloque-secundario-head-divider", CELL_MIN)}>
                    ACCIONES
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={colCount} message="No hay cajas de tesorería registradas." />
              ) : (
                filas.map((f) => (
                  (() => {
                    const diasSinActualizar = getDiasSinActualizar(f.ultActualizacionIso);
                    const estaDesactualizada = diasSinActualizar !== null && diasSinActualizar > 5;
                    const titleUltActualizacion = estaDesactualizada
                      ? `${f.ultActualizacion} — ${diasSinActualizar} DÍAS SIN ACTUALIZAR`
                      : f.ultActualizacion;

                    return (
                      <TableRow
                        key={f.id}
                        onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(f) : undefined}
                        className={cn(onRowDoubleClick && "cursor-pointer")}
                      >
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={f.nombreCaja}>
                          <span className="celda-destacado truncate block">{f.nombreCaja}</span>
                        </TableCell>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={f.titular}>
                          <span className="truncate block">{f.titular}</span>
                        </TableCell>
                        <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                          {f.tipoCaja}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
                          ${fmtPrecio(f.monto)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "celda-datos tabular-nums whitespace-nowrap tabla-bloque-secundario-cell-divider",
                            CELL_MIN,
                            estaDesactualizada && TEXT_WARNING_CLASS
                          )}
                          title={titleUltActualizacion}
                        >
                          <span className="inline-flex items-center gap-1">
                            {f.ultActualizacion}
                            {estaDesactualizada ? (
                              <>
                                <TriangleAlert
                                  className="h-3.5 w-3.5 shrink-0"
                                  aria-hidden
                                />
                                <span className="text-[11px] font-semibold leading-none">
                                  +{diasSinActualizar} D
                                </span>
                              </>
                            ) : null}
                          </span>
                        </TableCell>
                        {esEditor ? (
                          <TableCell className={cn("celda-datos tabla-bloque-secundario-cell-divider", CELL_MIN, "p-1")}>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                className={TABLE_ROW_ICON_BUTTON_CLASS}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditDataClick?.(f);
                                }}
                                aria-label="Editar caja"
                                title="Editar caja"
                              >
                                <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                className={cn(
                                  TABLE_ROW_ICON_BUTTON_CLASS,
                                  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS
                                )}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteClick?.(f);
                                }}
                                aria-label="Eliminar caja"
                                title="Eliminar caja"
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })()
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filas.length > 0 ? (
          <div className="contenedor-tabla-gestion--pie-fijo-pie">
            <table
              ref={pieFooterTableRef}
              className="tabla-gestion-compacta w-full table-fixed border-collapse text-sm"
            >
              <ColgroupAnchos anchos={anchosColPct} />
              <tbody>
                <tr className="transition-[background-color] duration-150">
                  <td
                    className={cn("celda-datos font-bold uppercase whitespace-nowrap", CELL_MIN)}
                    colSpan={3}
                  >
                    TOTAL
                  </td>
                  <td className={cn(TD_NUM, "celda-datos celda-destacado font-bold whitespace-nowrap", CELL_MIN)}>
                    ${fmtPrecio(totalMonto)}
                  </td>
                  <td
                    className={cn(
                      "celda-datos tabular-nums whitespace-nowrap tabla-bloque-secundario-cell-divider",
                      CELL_MIN
                    )}
                    aria-hidden
                  />
                  {esEditor ? (
                    <td
                      className={cn(
                        "celda-datos tabular-nums whitespace-nowrap tabla-bloque-secundario-cell-divider",
                        CELL_MIN
                      )}
                      aria-hidden
                    />
                  ) : null}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
