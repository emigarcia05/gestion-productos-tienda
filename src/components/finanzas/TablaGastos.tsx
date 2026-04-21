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
import { fmtPrecio } from "@/lib/format";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import { Pencil, Trash2 } from "lucide-react";

export type { BalanceGastoMensualFila };

interface Props {
  filas: BalanceGastoMensualFila[];
  /** Si hay datos crudos pero `filas` ya filtradas quedó vacío. */
  emptyMessage?: string;
  esEditor?: boolean;
  onEditarMonto?: (fila: BalanceGastoMensualFila) => void;
  onEliminar?: (fila: BalanceGastoMensualFila) => void;
}

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const TD_ACCIONES = "celda-datos w-[5.5rem] bg-muted/25 text-muted-foreground";

export default function TablaGastos({
  filas,
  emptyMessage,
  esEditor = false,
  onEditarMonto,
  onEliminar,
}: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);
  const totalPagado = filas.reduce((acc, fila) => acc + fila.pagado, 0);
  const totalPendiente = filas.reduce((acc, fila) => acc + fila.montoDevengadoPendiente, 0);
  const mostrarAcciones = esEditor && onEditarMonto && onEliminar;
  const colCount = mostrarAcciones ? 10 : 9;

  function celdaMonto(m: number) {
    if (m === 0) return <span className="text-muted-foreground">—</span>;
    return <>${fmtPrecio(m)}</>;
  }

  const mensajeVacio = emptyMessage ?? "No hay gastos registrados.";

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[7rem]">FECHA</TableHead>
                <TableHead className="min-w-[8rem]">SUCURSAL</TableHead>
                <TableHead className="min-w-[8rem]">TIPO GASTO</TableHead>
                <TableHead className="min-w-[8rem]">RUBRO</TableHead>
                <TableHead className="min-w-[10rem]">GASTO</TableHead>
                <TableHead className="min-w-[9rem]">PROVEEDOR</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7rem]")}>MONTO</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7rem]")}>PAGADO.</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[8rem]")}>MTDO. DEVENG. PEND.</TableHead>
                {mostrarAcciones ? (
                  <TableHead className={cn(TD_ACCIONES, "text-center text-[11px] font-semibold uppercase")}>
                    Acc.
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
                    <TableCell className="celda-datos whitespace-nowrap">
                      {formatIsoYmdDdMmYyyyArgentina(f.fechaDevengoIso)}
                    </TableCell>
                    <TableCell className="celda-datos whitespace-nowrap">{f.sucursalNombre}</TableCell>
                    <TableCell className="celda-datos whitespace-nowrap">{f.tipoGastoNombre}</TableCell>
                    <TableCell className="celda-datos whitespace-nowrap">{f.rubroNombre}</TableCell>
                    <TableCell className="celda-datos min-w-0" title={f.gastoNombre}>
                      <span className="celda-destacado truncate block">{f.gastoNombre}</span>
                    </TableCell>
                    <TableCell className="celda-datos min-w-0" title={f.proveedorNombre}>
                      <span className="truncate block">{f.proveedorNombre}</span>
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado")}>{celdaMonto(f.monto)}</TableCell>
                    <TableCell className={cn(TD_NUM)}>${fmtPrecio(f.pagado)}</TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado")}>
                      ${fmtPrecio(f.montoDevengadoPendiente)}
                    </TableCell>
                    {mostrarAcciones ? (
                      <TableCell className={cn(TD_ACCIONES, "p-1")}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Editar monto"
                            aria-label={`Editar monto ${f.gastoNombre}`}
                            onClick={() => onEditarMonto!(f)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Eliminar imputación"
                            aria-label={`Eliminar ${f.gastoNombre}`}
                            onClick={() => onEliminar!(f)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                  <TableCell className={cn(TD_NUM, "celda-destacado font-bold")}>
                    {totalMonto === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>${fmtPrecio(totalMonto)}</>
                    )}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>${fmtPrecio(totalPagado)}</TableCell>
                  <TableCell className={cn(TD_NUM, "celda-destacado font-bold")}>
                    ${fmtPrecio(totalPendiente)}
                  </TableCell>
                  {mostrarAcciones ? <TableCell className={TD_ACCIONES} aria-hidden /> : null}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>
    </div>
  );
}
