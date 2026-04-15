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
import { Pencil, Trash2 } from "lucide-react";

export interface TesoreriaCajaFila {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: string;
  monto: number;
  ultActualizacion: string;
}
interface Props {
  filas: TesoreriaCajaFila[];
  esEditor?: boolean;
  onRowDoubleClick?: (fila: TesoreriaCajaFila) => void;
  onEditDataClick?: (fila: TesoreriaCajaFila) => void;
  onDeleteClick?: (fila: TesoreriaCajaFila) => void;
}

const COLS = 5;

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

export default function TablaTesoreriaCajas({
  filas,
  esEditor = false,
  onRowDoubleClick,
  onEditDataClick,
  onDeleteClick,
}: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);
  const colCount = esEditor ? COLS + 1 : COLS;

  return (
    <div className="flex flex-1 min-h-0 flex-col px-4 pb-4 sm:px-6 lg:px-8">
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[10rem]">CAJA</TableHead>
                <TableHead className="min-w-[10rem]">TITULAR</TableHead>
                <TableHead className="min-w-[7rem]">TIPO CAJA</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7rem]")}>MONTO</TableHead>
                <TableHead className="min-w-[10rem] tabla-bloque-secundario-head-divider">
                  ÚLT. ACTUALIZACIÓN
                </TableHead>
                {esEditor ? (
                  <TableHead className="w-[6rem] text-center tabla-bloque-secundario-head-divider">
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
                  <TableRow
                    key={f.id}
                    onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(f) : undefined}
                    className={cn(onRowDoubleClick && "cursor-pointer")}
                  >
                    <TableCell className="celda-datos min-w-0" title={f.nombreCaja}>
                      <span className="celda-destacado truncate block">{f.nombreCaja}</span>
                    </TableCell>
                    <TableCell className="celda-datos min-w-0" title={f.titular}>
                      <span className="truncate block">{f.titular}</span>
                    </TableCell>
                    <TableCell className="celda-datos whitespace-nowrap">{f.tipoCaja}</TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado")}>${fmtPrecio(f.monto)}</TableCell>
                    <TableCell className="celda-datos tabular-nums whitespace-nowrap tabla-bloque-secundario-cell-divider">
                      {f.ultActualizacion}
                    </TableCell>
                    {esEditor ? (
                      <TableCell className="celda-datos tabla-bloque-secundario-cell-divider">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditDataClick?.(f);
                            }}
                            aria-label="Editar caja"
                            title="Editar caja"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteClick?.(f);
                            }}
                            aria-label="Eliminar caja"
                            title="Eliminar caja"
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
                  <TableCell className="celda-datos font-bold uppercase" colSpan={3}>
                    TOTAL
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "celda-destacado font-bold")}>
                    ${fmtPrecio(totalMonto)}
                  </TableCell>
                  <TableCell className="celda-datos tabular-nums whitespace-nowrap tabla-bloque-secundario-cell-divider" />
                  {esEditor ? (
                    <TableCell className="celda-datos tabular-nums whitespace-nowrap tabla-bloque-secundario-cell-divider" />
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
