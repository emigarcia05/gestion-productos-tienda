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

export interface DeudaProveedorRow {
  idProveedorDux: string;
  nombre: string;
  deudaTotal: string;
  vencida: string;
  dias5: string;
  dias30: string;
  dias45: string;
  dias60: string;
}

const COLS = 7;

function fmtDeudaArs(deudaStr: string): string {
  const n = Number(deudaStr);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

const CAMPOS_SUMA = [
  "deudaTotal",
  "vencida",
  "dias5",
  "dias30",
  "dias45",
  "dias60",
] as const;

function sumarTotales(filas: DeudaProveedorRow[]): Record<(typeof CAMPOS_SUMA)[number], number> {
  const acc: Record<(typeof CAMPOS_SUMA)[number], number> = {
    deudaTotal: 0,
    vencida: 0,
    dias5: 0,
    dias30: 0,
    dias45: 0,
    dias60: 0,
  };
  for (const f of filas) {
    for (const k of CAMPOS_SUMA) {
      acc[k] += Number(f[k]);
    }
  }
  return acc;
}

export default function TablaDeudaProveedores({
  filas,
  onProveedorDoubleClick,
}: {
  filas: DeudaProveedorRow[];
  onProveedorDoubleClick?: (proveedor: string) => void;
}) {
  const totales = filas.length > 0 ? sumarTotales(filas) : null;
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 px-8 pb-4">
      <p
        className={cn(
          "shrink-0 text-sm font-semibold text-muted-foreground tracking-wide uppercase"
        )}
        aria-live="polite"
      >
        {`${filas.length.toLocaleString("es-AR")} PROVEEDOR${filas.length === 1 ? "" : "ES"} CON DEUDA`}
      </p>
      <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
          <Table variant="compact" scrollX={false} className="tabla-deuda-proveedores">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[12rem] text-center align-middle">PROVEEDOR</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7.5rem]")}>DEUDA TOTAL</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[7rem]")}>VENCIDA</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[6rem]")}>5 DÍAS</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[6rem]")}>30 DÍAS</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[6rem]")}>45 DÍAS</TableHead>
                <TableHead className={cn(TH_NUM, "min-w-[6rem]")}>60 DÍAS</TableHead>
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
                  <TableRow
                    key={f.nombre}
                    title={
                      onProveedorDoubleClick
                        ? `${f.nombre} · DOBLE CLIC PARA VER DETALLE DE VENCIMIENTOS`
                        : undefined
                    }
                    onDoubleClick={
                      onProveedorDoubleClick
                        ? () => onProveedorDoubleClick(f.nombre.toUpperCase())
                        : undefined
                    }
                    className={cn(onProveedorDoubleClick && "cursor-pointer select-none hover:bg-primary/5")}
                  >
                    <TableCell
                      className="celda-datos celda-proveedor-deuda min-w-[12rem] max-w-[24rem] text-center align-middle font-medium"
                      title={f.nombre}
                    >
                      {f.nombre}
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "font-semibold")}>{fmtDeudaArs(f.deudaTotal)}</TableCell>
                    <TableCell className={TD_NUM}>{fmtDeudaArs(f.vencida)}</TableCell>
                    <TableCell className={TD_NUM}>{fmtDeudaArs(f.dias5)}</TableCell>
                    <TableCell className={TD_NUM}>{fmtDeudaArs(f.dias30)}</TableCell>
                    <TableCell className={TD_NUM}>{fmtDeudaArs(f.dias45)}</TableCell>
                    <TableCell className={TD_NUM}>{fmtDeudaArs(f.dias60)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {totales ? (
              <TableFooter>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                  <TableCell className="celda-datos celda-proveedor-deuda min-w-[12rem] max-w-[24rem] text-center align-middle font-bold uppercase">
                    TOTAL
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>
                    {fmtDeudaArs(totales.deudaTotal.toFixed(2))}
                  </TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>{fmtDeudaArs(totales.vencida.toFixed(2))}</TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>{fmtDeudaArs(totales.dias5.toFixed(2))}</TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>{fmtDeudaArs(totales.dias30.toFixed(2))}</TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>{fmtDeudaArs(totales.dias45.toFixed(2))}</TableCell>
                  <TableCell className={cn(TD_NUM, "font-bold")}>{fmtDeudaArs(totales.dias60.toFixed(2))}</TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </div>
    </div>
  );
}
