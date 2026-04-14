import {
  Table,
  TableBody,
  TableCell,
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
  sucursal: string;
  tipoCaja: string;
  monto: number;
  ultActualizacion: string;
}

const COLS = 5;

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

export default function TablaTesoreriaCajas({ filas }: { filas: TesoreriaCajaFila[] }) {
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
                <TableHead className="min-w-[8rem]">SUCURSAL</TableHead>
                <TableHead className="min-w-[7rem]">TIPO CAJA</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7rem]")}>MONTO</TableHead>
                <TableHead className="min-w-[10rem]">ÚLT. ACTUALIZACIÓN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={COLS} message="No hay cajas de tesorería registradas." />
              ) : (
                filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="celda-datos min-w-0" title={f.nombreCaja}>
                      <span className="celda-destacado truncate block">{f.nombreCaja}</span>
                    </TableCell>
                    <TableCell className="celda-datos" title={f.sucursal}>
                      {f.sucursal}
                    </TableCell>
                    <TableCell className="celda-datos whitespace-nowrap">{f.tipoCaja}</TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado")}>${fmtPrecio(f.monto)}</TableCell>
                    <TableCell className="celda-datos tabular-nums whitespace-nowrap">
                      {f.ultActualizacion}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
