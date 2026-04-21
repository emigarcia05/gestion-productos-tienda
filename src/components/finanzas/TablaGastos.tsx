import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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

/** Anchos con columna ACCIONES (suma 100%). Sin ACCIONES, el 14% de acciones pasa a PROVEEDOR (34%). */
const ANCHOS_PCT_CON_ACCIONES = [8, 8, 8, 8, 10, 20, 8, 8, 8, 14] as const;
const ANCHOS_PCT_SIN_ACCIONES = [8, 8, 8, 8, 10, 34, 8, 8, 8] as const;

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
  const anchosPct = mostrarAcciones ? ANCHOS_PCT_CON_ACCIONES : ANCHOS_PCT_SIN_ACCIONES;
  const wCol = (i: number) => ({ style: { width: `${anchosPct[i]}%` } as const });

  function celdaMonto(m: number) {
    if (m === 0) return <span className="text-muted-foreground">—</span>;
    return <>${fmtPrecio(m)}</>;
  }

  const mensajeVacio = emptyMessage ?? "No hay gastos registrados.";

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false} className="table-fixed w-full">
            <colgroup>
              {anchosPct.map((pct, i) => (
                <col key={i} style={{ width: `${pct}%` }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-0" {...wCol(0)}>
                  FECHA
                </TableHead>
                <TableHead className="min-w-0" {...wCol(1)}>
                  SUCURSAL
                </TableHead>
                <TableHead className="min-w-0" {...wCol(2)}>
                  TIPO GASTO
                </TableHead>
                <TableHead className="min-w-0" {...wCol(3)}>
                  RUBRO
                </TableHead>
                <TableHead className="min-w-0" {...wCol(4)}>
                  GASTO
                </TableHead>
                <TableHead className="min-w-0" {...wCol(5)}>
                  PROVEEDOR
                </TableHead>
                <TableHead className={cn(TH_NUM, "min-w-0")} {...wCol(6)}>
                  MONTO
                </TableHead>
                <TableHead className={cn(TH_NUM, "min-w-0")} {...wCol(7)}>
                  PAGADO
                </TableHead>
                <TableHead className={cn(TH_NUM, "min-w-0")} {...wCol(8)}>
                  MONTO DEVENGADO
                </TableHead>
                {mostrarAcciones ? (
                  <TableHead className={cn(TH_ACCIONES, "min-w-0")} {...wCol(9)}>
                    ACCIONES
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={colCount} message={mensajeVacio} />
              ) : (
                filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className={cn("celda-datos whitespace-nowrap", "min-w-0")} {...wCol(0)}>
                      {formatIsoYmdDdMmYyyyArgentina(f.fechaDevengoIso)}
                    </TableCell>
                    <TableCell className={cn("celda-datos whitespace-nowrap", "min-w-0")} {...wCol(1)}>
                      {f.sucursalNombre}
                    </TableCell>
                    <TableCell className={cn("celda-datos whitespace-nowrap", "min-w-0")} {...wCol(2)}>
                      {f.tipoGastoNombre}
                    </TableCell>
                    <TableCell className={cn("celda-datos whitespace-nowrap", "min-w-0")} {...wCol(3)}>
                      {f.rubroNombre}
                    </TableCell>
                    <TableCell className={cn("celda-datos min-w-0")} {...wCol(4)} title={f.gastoNombre}>
                      <span className="celda-destacado truncate block">{f.gastoNombre}</span>
                    </TableCell>
                    <TableCell className={cn("celda-datos min-w-0")} {...wCol(5)} title={f.proveedorNombre}>
                      <span className="truncate block">{f.proveedorNombre}</span>
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado", "min-w-0")} {...wCol(6)}>
                      {celdaMonto(f.monto)}
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "min-w-0")} {...wCol(7)}>
                      ${fmtPrecio(f.pagado)}
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado", "min-w-0")} {...wCol(8)}>
                      ${fmtPrecio(f.montoDevengadoPendiente)}
                    </TableCell>
                    {mostrarAcciones ? (
                      <TableCell className={cn(TD_ACCIONES, "p-1")} {...wCol(9)}>
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
                            aria-label={`Registrar pago ${f.gastoNombre}`}
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
            {filas.length > 0 ? (
              <TableFooter>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                  <TableCell className="celda-datos font-bold uppercase" colSpan={mostrarAcciones ? 7 : 6}>
                    TOTAL
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "celda-destacado font-bold", "min-w-0")} {...wCol(6)}>
                    {totalMonto === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>${fmtPrecio(totalMonto)}</>
                    )}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold", "min-w-0")} {...wCol(7)}>
                    ${fmtPrecio(totalPagado)}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "celda-destacado font-bold", "min-w-0")} {...wCol(8)}>
                    ${fmtPrecio(totalPendiente)}
                  </TableCell>
                  {mostrarAcciones ? (
                    <TableCell className={cn(TD_ACCIONES, "min-w-0")} {...wCol(9)} aria-hidden />
                  ) : null}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>
    </div>
  );
}
