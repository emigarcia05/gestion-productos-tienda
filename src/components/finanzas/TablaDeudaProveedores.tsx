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

export interface DeudaProveedorRow {
  idProveedorDux: string;
  nombre: string;
  deuda: string;
}

const COLS = 3;

function fmtDeudaArs(deudaStr: string): string {
  const n = Number(deudaStr);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TablaDeudaProveedores({ filas }: { filas: DeudaProveedorRow[] }) {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 px-4 pb-4 sm:px-6 lg:px-8">
      <p
        className={cn(
          "shrink-0 text-sm font-semibold text-muted-foreground tracking-wide uppercase"
        )}
        aria-live="polite"
      >
        {`${filas.length.toLocaleString("es-AR")} PROVEEDOR${filas.length === 1 ? "" : "ES"} CON DEUDA`}
      </p>
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[45%]">PROVEEDOR</TableHead>
                <TableHead className="w-[25%]">ID PROV. DUX</TableHead>
                <TableHead className="w-[30%] text-right">DEUDA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <EmptyTableRow
                  colSpan={COLS}
                  message="No hay proveedores con deuda según comprobantes sincronizados."
                />
              ) : (
                filas.map((f) => (
                  <TableRow key={f.idProveedorDux}>
                    <TableCell className="celda-datos min-w-0 font-medium">
                      {f.nombre}
                    </TableCell>
                    <TableCell className="celda-datos tabular-nums text-muted-foreground">
                      {f.idProveedorDux}
                    </TableCell>
                    <TableCell className="celda-datos text-right tabular-nums font-semibold">
                      {fmtDeudaArs(f.deuda)}
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
