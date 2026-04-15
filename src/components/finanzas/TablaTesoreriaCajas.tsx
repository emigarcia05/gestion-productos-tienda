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
import { cn } from "@/lib/utils";
import { fmtPrecio } from "@/lib/format";

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
  onRowDoubleClick?: (fila: TesoreriaCajaFila) => void;
}

const COLS = 5;

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

export default function TablaTesoreriaCajas({ filas, onRowDoubleClick }: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 px-4 pb-4 sm:px-6 lg:px-8">
      <p
        className={cn(
          "shrink-0 text-sm font-semibold text-muted-foreground tracking-wide uppercase"
        )}
        aria-live="polite"
      >
        {`${filas.length.toLocaleString("es-AR")} CAJA${filas.length === 1 ? "" : "S"}`}
      </p>
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[10rem]">NOMBRE CAJA</TableHead>
                <TableHead className="min-w-[10rem]">TITULAR</TableHead>
                <TableHead className="min-w-[7rem]">TIPO CAJA</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7rem]")}>MONTO</TableHead>
                <TableHead className="min-w-[10rem] tabla-bloque-secundario-head-divider">
                  ÚLT. ACTUALIZACIÓN
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={COLS} message="No hay cajas de tesorería registradas." />
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
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>
    </div>
  );
}
