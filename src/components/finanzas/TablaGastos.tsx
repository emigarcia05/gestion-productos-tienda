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
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";

export type { BalanceGastoMensualFila };

interface Props {
  filas: BalanceGastoMensualFila[];
}

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

export default function TablaGastos({ filas }: Props) {
  const totalMonto = filas.reduce((acc, fila) => acc + fila.monto, 0);
  const totalPagado = filas.reduce((acc, fila) => acc + fila.pagado, 0);
  const totalPendiente = filas.reduce((acc, fila) => acc + fila.montoDevengadoPendiente, 0);

  function celdaMonto(m: number) {
    if (m === 0) return <span className="text-muted-foreground">—</span>;
    return <>${fmtPrecio(m)}</>;
  }

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow colSpan={9} message="No hay gastos registrados." />
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
                  </TableRow>
                ))
              )}
            </TableBody>
            {filas.length > 0 ? (
              <TableFooter>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                  <TableCell className="celda-datos font-bold uppercase" colSpan={6}>
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
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>
    </div>
  );
}
