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

export interface GastoFila {
  id: string;
  tipoGasto: string;
  nombre: string;
  monto: number;
}

interface Props {
  filas: GastoFila[];
}

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

export default function TablaGastos({ filas }: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);

  return (
    <div className="flex flex-1 min-h-0 flex-col pb-4">
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[9rem]">TIPO GASTO</TableHead>
                <TableHead className="min-w-[14rem]">NOMBRE</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[8rem]")}>MONTO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={3} message="No hay gastos registrados." />
              ) : (
                filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="celda-datos whitespace-nowrap">{f.tipoGasto}</TableCell>
                    <TableCell className="celda-datos min-w-0" title={f.nombre}>
                      <span className="celda-destacado truncate block">{f.nombre}</span>
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "celda-destacado")}>
                      ${fmtPrecio(f.monto)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filas.length > 0 ? (
              <TableFooter>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                  <TableCell className="celda-datos font-bold uppercase" colSpan={2}>
                    TOTAL
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "celda-destacado font-bold")}>
                    ${fmtPrecio(totalMonto)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>
    </div>
  );
}
