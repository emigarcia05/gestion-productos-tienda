"use client";

import type { ReactNode } from "react";
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

export interface TesoreriaCajaFila {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: string;
  /** Valor persistido en BD (p. ej. edición de caja); no usar para totales si existe `montoDisponible`. */
  monto: number;
  /** Monto que cuenta hoy para totales y columna MONTO (cajas CHEQUE: cheques con fecha de acreditación ≤ hoy AR). */
  montoDisponible: number;
  ultActualizacion: string;
  ultActualizacionIso: string;
}
interface Props {
  filas: TesoreriaCajaFila[];
  esEditor?: boolean;
  /** Caja tipo CHEQUE: un clic abre el detalle de cheques (no confunde con doble clic de monto). */
  onChequeRowClick?: (fila: TesoreriaCajaFila) => void;
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

/** Suma `monto` por `tipoCaja` y total general (misma lógica que filtros del padre: recibe `filas` ya filtradas). */
function totalesPorTipoCaja(filas: TesoreriaCajaFila[]): {
  efectivo: number;
  digital: number;
  cheque: number;
  total: number;
} {
  let efectivo = 0;
  let digital = 0;
  let cheque = 0;
  for (const f of filas) {
    const m = f.montoDisponible;
    if (f.tipoCaja === "EFECTIVO") efectivo += m;
    else if (f.tipoCaja === "DIGITAL") digital += m;
    else if (f.tipoCaja === "CHEQUE") cheque += m;
  }
  const total = filas.reduce((acc, f) => acc + f.montoDisponible, 0);
  return { efectivo, digital, cheque, total };
}

function TarjetaResumenTesoreria({
  etiqueta,
  children,
  valorDestacado,
}: {
  etiqueta: string;
  children: ReactNode;
  valorDestacado?: boolean;
}) {
  return (
    <div className="finanzas-resumen-tarjeta">
      <span className="w-full text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      <span
        className={cn(
          "celda-destacado w-full text-center text-sm tabular-nums leading-tight",
          valorDestacado ? "font-bold" : "font-medium"
        )}
      >
        {children}
      </span>
    </div>
  );
}

export default function TablaTesoreriaCajas({
  filas,
  esEditor = false,
  onChequeRowClick,
  onRowDoubleClick,
  onEditDataClick,
  onDeleteClick,
}: Props) {
  const { efectivo, digital, cheque, total } = totalesPorTipoCaja(filas);
  const colCount = esEditor ? COLS + 1 : COLS;
  const anchosColPct = esEditor ? COL_WIDTHS_PCT_CON_ACCIONES : COL_WIDTHS_PCT_SIN_ACCIONES;

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion contenedor-tabla-gestion--pie-fijo flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="contenedor-tabla-gestion--pie-fijo-scroll">
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

                    const puedeEditarMontoDblClick =
                      onRowDoubleClick != null && f.tipoCaja !== "CHEQUE";
                    const abrirListaCheques =
                      f.tipoCaja === "CHEQUE" && onChequeRowClick
                        ? () => onChequeRowClick(f)
                        : undefined;

                    return (
                      <TableRow
                        key={f.id}
                        onClick={abrirListaCheques}
                        onDoubleClick={
                          puedeEditarMontoDblClick ? () => onRowDoubleClick!(f) : undefined
                        }
                        title={
                          abrirListaCheques
                            ? "Clic para ver los cheques de esta caja"
                            : puedeEditarMontoDblClick
                              ? "Doble clic para actualizar el monto"
                              : undefined
                        }
                        className={cn(
                          (puedeEditarMontoDblClick || abrirListaCheques) && "cursor-pointer"
                        )}
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
                          ${fmtPrecio(f.montoDisponible)}
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
          <div
            className="w-full shrink-0 border-t border-border px-2 py-2"
            role="region"
            aria-label="Totales por tipo de caja y total general"
            aria-live="polite"
          >
            <div className="flex w-full flex-wrap items-stretch justify-center gap-2">
              <TarjetaResumenTesoreria etiqueta="EFECTIVO">${fmtPrecio(efectivo)}</TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria etiqueta="DIGITAL">${fmtPrecio(digital)}</TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria etiqueta="CHEQUE">${fmtPrecio(cheque)}</TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria etiqueta="TOTAL" valorDestacado>
                ${fmtPrecio(total)}
              </TarjetaResumenTesoreria>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
