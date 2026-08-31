"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { EstVtasBarraProducto } from "@/lib/estVtasTypes";
import { fmtPctParticipacion } from "@/lib/format";

interface Props {
  filas: EstVtasBarraProducto[];
  /** Un. totales del recorte (todos los productos filtrados, no solo el top 10). */
  totalFiltrado: number;
  /** `codTienda` del producto seleccionado. */
  seleccionadoCod?: string | null;
  onSeleccionar?: (codTienda: string | null) => void;
  vacioPorDependencia?: string | null;
  sinVentasCargadas?: boolean;
  className?: string;
}

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/**
 * Top 10 productos en tabla: DESCRIPCION · TO. (total con filtros) · PM. · %.
 * Periodos = años seleccionados × meses seleccionados.
 * % = TO. / Un. total del recorte filtrado (no del top 10). Columnas 61 % / 13 % / 13 % / 13 %.
 */
export default function EstVtasGraficoTopProductos({
  filas,
  totalFiltrado,
  seleccionadoCod = null,
  onSeleccionar,
  vacioPorDependencia = null,
  sinVentasCargadas = false,
  className,
}: Props) {
  const vacio = filas.length === 0;
  const seleccionable = typeof onSeleccionar === "function";

  function handleClick(codTienda: string) {
    if (!onSeleccionar) return;
    onSeleccionar(seleccionadoCod === codTienda ? null : codTienda);
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label="Top 10 productos por unidades vendidas"
    >
      <header className="flex shrink-0 flex-col items-center gap-0.5">
        <h2 className="est-vtas-titulo-pildora">Top 10 Productos</h2>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {vacio ? (
          <div className="flex min-h-[14rem] flex-1 items-center justify-center border-l border-b border-border">
            <p className="max-w-[16rem] px-2 text-center text-xs text-muted-foreground">
              {vacioPorDependencia
                ? vacioPorDependencia
                : sinVentasCargadas
                  ? "No hay ventas cargadas. Subí datos en Carga De Datos y volvé a abrir este módulo."
                  : "No hay ventas para los filtros o el periodo seleccionados. Probá otra fecha con datos cargados."}
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto border border-border">
            <Table className="tabla-gestion-compacta w-full table-fixed">
              <colgroup>
                <col className="w-[61%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">DESCRIPCION</TableHead>
                  <TableHead className="text-center" title="Total (filtros activos)">
                    TO.
                  </TableHead>
                  <TableHead
                    className="text-center"
                    title="Promedio = Total / (años × meses filtrados)"
                  >
                    PM.
                  </TableHead>
                  <TableHead
                    className="text-center"
                    title="Participación = TO. / Un. total de los filtros"
                  >
                    %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => {
                  const activa = seleccionadoCod === f.codTienda;
                  const desc = (
                    <span
                      className="line-clamp-2 min-w-0 text-left text-[11px] font-medium uppercase leading-tight text-foreground"
                      title={f.etiqueta}
                    >
                      {f.etiqueta}
                    </span>
                  );

                  return (
                    <TableRow
                      key={f.codTienda}
                      className="tabla-fila-altura-auto"
                      data-state={activa ? "selected" : undefined}
                    >
                      <TableCell className="celda-datos min-w-0 align-middle !py-1">
                        {seleccionable ? (
                          <button
                            type="button"
                            aria-pressed={activa}
                            aria-label={`Seleccionar ${f.etiqueta}`}
                            onClick={() => handleClick(f.codTienda)}
                            className={cn(
                              "est-vtas-desc-btn block w-full min-w-0 max-w-full text-left",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
                              activa &&
                                "rounded-sm ring-2 ring-primary/70 ring-offset-1 ring-offset-card"
                            )}
                          >
                            {desc}
                          </button>
                        ) : (
                          desc
                        )}
                      </TableCell>
                      <TableCell className="celda-datos text-center text-[11px] tabular-nums !py-1">
                        {fmtUnidades(f.totalPeriodo)}
                      </TableCell>
                      <TableCell className="celda-datos text-center text-[11px] tabular-nums !py-1">
                        {fmtUnidades(f.promedioMensual)}
                      </TableCell>
                      <TableCell className="celda-datos text-center text-[11px] tabular-nums text-muted-foreground !py-1">
                        {fmtPctParticipacion(f.totalPeriodo, totalFiltrado)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
