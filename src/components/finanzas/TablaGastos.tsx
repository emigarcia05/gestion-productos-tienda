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
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { fmtPrecio } from "@/lib/format";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import { Banknote, BarChart2, Pencil, Trash2 } from "lucide-react";
import { type ReactNode } from "react";

export type { BalanceGastoMensualFila };

interface Props {
  filas: BalanceGastoMensualFila[];
  /** Si hay datos crudos pero `filas` ya filtradas quedó vacío. */
  emptyMessage?: string;
  esEditor?: boolean;
  onEditarMonto?: (fila: BalanceGastoMensualFila) => void;
  onPagar?: (fila: BalanceGastoMensualFila) => void;
  onEliminar?: (fila: BalanceGastoMensualFila) => void;
  /** Abre el histórico mensual del gasto final (mismo modal que balance mensual). */
  onVerHistorico?: (fila: BalanceGastoMensualFila) => void;
}

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
/** Primera columna del bloque secundario: línea vertical #0072bb (mismo patrón que el resto de tablas). */
const TH_ACCIONES =
  "min-w-0 tabla-bloque-secundario-head-divider text-center text-[11px] font-semibold uppercase";
const TD_ACCIONES =
  "celda-datos min-w-0 bg-muted/25 text-muted-foreground tabla-bloque-secundario-cell-divider";

/** Pesos FECHA…PAGADO (sin ACCIONES): 8 columnas. Suman 86 (con editor + ACCIONES 14 → 100%). */
const COL_WIDTHS_DATA_PCT = [9, 9, 9, 15, 12, 14, 9, 9] as const;
/** FECHA…PAGADO + ACCIONES; suma 100. */
const COL_WIDTHS_PCT_CON_ACCIONES: readonly number[] = [...COL_WIDTHS_DATA_PCT, 14];
/** Sin ACCIONES: mismos pesos relativos que {@link COL_WIDTHS_DATA_PCT}, escalados a suma 100%. */
const COL_WIDTHS_PCT_SIN_ACCIONES: readonly number[] = COL_WIDTHS_DATA_PCT.map(
  (w) => (w * 100) / 86
);

const CELL_MIN = "min-w-0";

/** Resumen de totales bajo la tabla (sin fila de pie). */
function TarjetaTotalGasto({
  etiqueta,
  children,
  title,
}: {
  etiqueta: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="finanzas-resumen-tarjeta" title={title}>
      <span className="w-full text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      <span className="celda-destacado w-full text-sm font-medium tabular-nums leading-tight">
        {children}
      </span>
    </div>
  );
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

export default function TablaGastos({
  filas,
  emptyMessage,
  esEditor = false,
  onEditarMonto,
  onPagar,
  onEliminar,
  onVerHistorico,
}: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);
  const totalPagado = filas.reduce((acc, fila) => acc + fila.pagado, 0);
  const totalPendiente = filas.reduce(
    (acc, fila) => acc + Math.max(0, fila.monto - fila.pagado),
    0
  );
  const mostrarAcciones = esEditor && onEditarMonto && onPagar && onEliminar;
  const anchosFullPct = mostrarAcciones ? COL_WIDTHS_PCT_CON_ACCIONES : COL_WIDTHS_PCT_SIN_ACCIONES;

  function celdaMonto(m: number) {
    if (m === 0) return <span className="text-muted-foreground">—</span>;
    return <>${fmtPrecio(m)}</>;
  }

  const mensajeVacio = emptyMessage ?? "No hay gastos registrados.";

  function renderCeldasDatos(f: BalanceGastoMensualFila) {
    return (
      <>
        <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
          {formatIsoYmdDdMmYyyyArgentina(f.fechaDevengoIso)}
        </TableCell>
        <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
          {f.sucursalNombre}
        </TableCell>
        <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
          {f.tipoGastoNombre}
        </TableCell>
        <TableCell className={cn("celda-datos", CELL_MIN)} title={f.proveedorNombre}>
          <span className="truncate block">{f.proveedorNombre}</span>
        </TableCell>
        <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
          {f.rubroNombre}
        </TableCell>
        <TableCell
          className={cn("celda-datos", CELL_MIN)}
          title={
            f.gastoFinalComentarios
              ? `${f.gastoNombre} (${f.gastoFinalComentarios})`
              : f.gastoNombre
          }
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="celda-destacado block truncate">{f.gastoNombre}</span>
            {f.gastoFinalComentarios ? (
              <span
                className="line-clamp-2 break-words text-[11px] font-normal leading-snug text-muted-foreground"
                title={f.gastoFinalComentarios}
              >
                ({f.gastoFinalComentarios})
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
          <div className="flex w-full items-stretch justify-end gap-1">
            {!mostrarAcciones && onVerHistorico ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                title="Ver evolución mensual del gasto"
                aria-label={`Ver evolución mensual — ${f.gastoNombre}`}
                onClick={() => onVerHistorico(f)}
              >
                <BarChart2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              </Button>
            ) : null}
            <span className="min-w-0 self-center">{celdaMonto(f.monto)}</span>
          </div>
        </TableCell>
        <TableCell className={cn(TD_NUM, CELL_MIN)}>{celdaMonto(f.pagado)}</TableCell>
      </>
    );
  }

  function renderCeldaAcciones(f: BalanceGastoMensualFila) {
    return (
      <TableCell className={cn(TD_ACCIONES, "celda-datos--accion-relleno-fila")}>
        <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "gap-1.5")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
            title="Registrar pago"
            aria-label={`Pagar ${f.gastoNombre}`}
            onClick={() => onPagar!(f)}
          >
            <Banknote className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
            title="Editar monto"
            aria-label={`Editar monto ${f.gastoNombre}`}
            onClick={() => onEditarMonto!(f)}
          >
            <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
            title="Eliminar imputación"
            aria-label={`Eliminar ${f.gastoNombre}`}
            onClick={() => onEliminar!(f)}
          >
            <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
          </Button>
          {onVerHistorico ? (
            <>
              <span
                role="separator"
                aria-orientation="vertical"
                className="mx-0.5 min-h-[var(--tabla-body-row-min-height)] w-px shrink-0 self-stretch bg-[#0072BB]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                title="Ver evolución mensual del gasto"
                aria-label={`Ver evolución mensual — ${f.gastoNombre}`}
                onClick={() => onVerHistorico(f)}
              >
                <BarChart2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
      </TableCell>
    );
  }

  const colSpanVacio = mostrarAcciones ? 9 : 8;

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion contenedor-tabla-gestion--pie-fijo flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="contenedor-tabla-gestion--pie-fijo-scroll flex min-h-0 min-w-0 flex-1 flex-col">
          <div data-slot="table-container" className="relative min-h-0 w-full min-w-0 max-w-full">
            <table
              data-slot="table"
              className="w-full caption-bottom text-sm tabla-gestion-compacta tabla-balance-gastos table-fixed"
            >
              <ColgroupAnchos anchos={anchosFullPct} />
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={CELL_MIN}>FECHA</TableHead>
                  <TableHead className={CELL_MIN}>SUCURSAL</TableHead>
                  <TableHead className={CELL_MIN}>TIPO GASTO</TableHead>
                  <TableHead className={CELL_MIN}>PROVEEDOR</TableHead>
                  <TableHead className={CELL_MIN}>RUBRO</TableHead>
                  <TableHead className={CELL_MIN}>GASTO</TableHead>
                  <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                  <TableHead className={cn(TH_NUM, CELL_MIN)}>PAGADO</TableHead>
                  {mostrarAcciones ? <TableHead className={TH_ACCIONES}>ACCIONES</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.length === 0 ? (
                  <EmptyTableRow colSpan={colSpanVacio} message={mensajeVacio} />
                ) : (
                  filas.map((f) => (
                    <TableRow key={f.id}>
                      {renderCeldasDatos(f)}
                      {mostrarAcciones ? renderCeldaAcciones(f) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </table>
          </div>
        </div>

        {filas.length > 0 ? (
          <div
            className="w-full shrink-0 border-t border-border px-2 py-2"
            role="region"
            aria-label="Totales del listado visible"
            aria-live="polite"
          >
            <div className="flex w-full flex-wrap items-stretch justify-center gap-2">
              <TarjetaTotalGasto etiqueta="MONTO">
                {totalMonto === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>${fmtPrecio(totalMonto)}</>
                )}
              </TarjetaTotalGasto>
              <TarjetaTotalGasto etiqueta="PAGADO">
                {totalPagado === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>${fmtPrecio(totalPagado)}</>
                )}
              </TarjetaTotalGasto>
              <TarjetaTotalGasto
                etiqueta="PENDIENTE"
                title="Suma de (monto − pagado) por fila, mínimo 0 en cada fila"
              >
                {totalPendiente === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>${fmtPrecio(totalPendiente)}</>
                )}
              </TarjetaTotalGasto>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
