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
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
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
  /** Solo cajas CHEQUE: cheques con fecha de acreditación > hoy AR (diferidos). */
  montoChequesDiferidos: number;
  ultActualizacion: string;
  ultActualizacionIso: string;
}
interface Props {
  filas: TesoreriaCajaFila[];
  esEditor?: boolean;
  /** Caja tipo CHEQUE: doble clic abre el detalle de cheques. */
  onChequeRowClick?: (fila: TesoreriaCajaFila) => void;
  onRowDoubleClick?: (fila: TesoreriaCajaFila) => void;
  onEditDataClick?: (fila: TesoreriaCajaFila) => void;
  onDeleteClick?: (fila: TesoreriaCajaFila) => void;
}

const COLS = 5;

/** Ancho relativo por columna (orden: ÚLT. ACT., CAJA, TITULAR, TIPO, MONTO [, ACCIONES]); suma 100. */
const COL_WIDTHS_PCT_CON_ACCIONES = [22, 16, 16, 11, 14, 21] as const;
const COL_WIDTHS_PCT_SIN_ACCIONES = [24, 18, 18, 12, 28] as const;

/** Columna ÚLT. ACT.: recuadro sólido `accent2` + ícono blanco (solo si hay alerta). */
const TESORERIA_ALERTA_CAJA_ACTIVA_CLASS = "border-accent2 bg-accent2 shadow-sm";

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

/** Suma por `tipoCaja` y totales (misma lógica que filtros del padre: recibe `filas` ya filtradas). */
function totalesPorTipoCaja(filas: TesoreriaCajaFila[]): {
  efectivo: number;
  digital: number;
  chequeAlDia: number;
  total: number;
  chequeDiferido: number;
  totalConChequeDiferido: number;
} {
  let efectivo = 0;
  let digital = 0;
  let chequeAlDia = 0;
  let chequeDiferido = 0;
  for (const f of filas) {
    const m = f.montoDisponible;
    if (f.tipoCaja === "EFECTIVO") efectivo += m;
    else if (f.tipoCaja === "DIGITAL") digital += m;
    else if (f.tipoCaja === "CHEQUE") {
      chequeAlDia += m;
      chequeDiferido += f.montoChequesDiferidos;
    }
  }
  const total = filas.reduce((acc, f) => acc + f.montoDisponible, 0);
  return {
    efectivo,
    digital,
    chequeAlDia,
    total,
    chequeDiferido,
    totalConChequeDiferido: total + chequeDiferido,
  };
}

function TarjetaResumenTesoreria({
  etiqueta,
  children,
  valorDestacado,
  compact,
  etiquetaClassName,
}: {
  etiqueta: string;
  children: ReactNode;
  valorDestacado?: boolean;
  compact?: boolean;
  etiquetaClassName?: string;
}) {
  return (
    <div
      className={cn(
        "finanzas-resumen-tarjeta",
        compact && "finanzas-resumen-tarjeta--compact"
      )}
    >
      <span
        className={cn(
          "w-full font-semibold uppercase tracking-wide text-muted-foreground",
          compact
            ? "finanzas-resumen-tarjeta--compact-etiqueta leading-tight"
            : "text-[10px] leading-none",
          etiquetaClassName
        )}
      >
        {etiqueta}
      </span>
      <span
        className={cn(
          "celda-destacado w-full text-center text-sm tabular-nums leading-tight",
          compact && "finanzas-resumen-tarjeta--compact-valor",
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
  const {
    efectivo,
    digital,
    chequeAlDia,
    total,
    chequeDiferido,
    totalConChequeDiferido,
  } = totalesPorTipoCaja(filas);
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
                <TableHead className={CELL_MIN}>ÚLT. ACTUALIZACIÓN</TableHead>
                <TableHead className={CELL_MIN}>CAJA</TableHead>
                <TableHead className={CELL_MIN}>TITULAR</TableHead>
                <TableHead className={CELL_MIN}>TIPO CAJA</TableHead>
                <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
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

                    const puedeEditarMontoDblClick =
                      onRowDoubleClick != null && f.tipoCaja !== "CHEQUE";
                    const abrirListaChequesDblClick =
                      f.tipoCaja === "CHEQUE" && onChequeRowClick
                        ? () => onChequeRowClick(f)
                        : undefined;

                    return (
                      <TableRow
                        key={f.id}
                        onDoubleClick={
                          puedeEditarMontoDblClick
                            ? () => onRowDoubleClick!(f)
                            : abrirListaChequesDblClick
                        }
                        title={
                          abrirListaChequesDblClick
                            ? "Doble clic para ver los cheques de esta caja"
                            : puedeEditarMontoDblClick
                              ? "Doble clic para actualizar el monto"
                              : undefined
                        }
                        className={cn(
                          (puedeEditarMontoDblClick || abrirListaChequesDblClick) && "cursor-pointer"
                        )}
                      >
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={f.ultActualizacion}>
                          <div className="flex w-full min-w-0 items-center gap-0">
                            <span
                              className={cn(
                                "inline-flex size-9 shrink-0 items-center justify-center rounded-md border-2",
                                estaDesactualizada
                                  ? TESORERIA_ALERTA_CAJA_ACTIVA_CLASS
                                  : "border-transparent"
                              )}
                              aria-hidden={estaDesactualizada ? undefined : true}
                              role={estaDesactualizada ? "img" : undefined}
                              aria-label={
                                estaDesactualizada && diasSinActualizar != null
                                  ? `Alerta: monto sin actualizar hace más de cinco días, más ${diasSinActualizar} días`
                                  : undefined
                              }
                              title={
                                estaDesactualizada && diasSinActualizar != null
                                  ? `Sin actualizar el monto hace más de 5 días (+${diasSinActualizar} d.)`
                                  : undefined
                              }
                            >
                              {estaDesactualizada ? (
                                <TriangleAlert
                                  className="size-5 shrink-0 text-white"
                                  strokeWidth={2.5}
                                  aria-hidden
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1 text-right tabular-nums whitespace-nowrap truncate">
                              {f.ultActualizacion}
                            </span>
                          </div>
                        </TableCell>
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
                        {esEditor ? (
                          <TableCell
                            className={cn(
                              "celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider",
                              CELL_MIN
                            )}
                          >
                            <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditDataClick?.(f);
                                }}
                                aria-label="Editar caja"
                                title="Editar caja"
                              >
                                <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteClick?.(f);
                                }}
                                aria-label="Eliminar caja"
                                title="Eliminar caja"
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
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
            className="w-full shrink-0 border-t border-border px-2 py-1"
            role="region"
            aria-label="Totales con cheques al día y con cheque diferido"
            aria-live="polite"
          >
            {/*
              Cuadrícula 4×2:
              EFECTIVO | DIGITAL | CHEQUE AL DÍA | TOTAL CON CHEQUE AL DÍA
              (vacío)  | (vacío) | CHEQUE DIFERIDO | TOTAL CON CHEQUE DIFERIDO
            */}
            <div
              className={cn(
                "grid w-full grid-cols-4 items-stretch gap-x-2 gap-y-2",
                "[&_.finanzas-resumen-tarjeta]:!w-full [&_.finanzas-resumen-tarjeta]:!min-w-0 [&_.finanzas-resumen-tarjeta]:!max-w-none"
              )}
            >
              <TarjetaResumenTesoreria etiqueta="EFECTIVO" compact>
                ${fmtPrecio(efectivo)}
              </TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria etiqueta="DIGITAL" compact>
                ${fmtPrecio(digital)}
              </TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria etiqueta="CHEQUE AL DÍA" compact>
                ${fmtPrecio(chequeAlDia)}
              </TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria
                etiqueta="TOTAL CON CHEQUE AL DÍA"
                valorDestacado
                compact
                etiquetaClassName="whitespace-normal leading-tight"
              >
                ${fmtPrecio(total)}
              </TarjetaResumenTesoreria>
              <div aria-hidden className="min-w-0" />
              <div aria-hidden className="min-w-0" />
              <TarjetaResumenTesoreria etiqueta="CHEQUE DIFERIDO" compact>
                ${fmtPrecio(chequeDiferido)}
              </TarjetaResumenTesoreria>
              <TarjetaResumenTesoreria
                etiqueta="TOTAL CON CHEQUE DIFERIDO"
                valorDestacado
                compact
                etiquetaClassName="whitespace-normal leading-tight"
              >
                ${fmtPrecio(totalConChequeDiferido)}
              </TarjetaResumenTesoreria>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
