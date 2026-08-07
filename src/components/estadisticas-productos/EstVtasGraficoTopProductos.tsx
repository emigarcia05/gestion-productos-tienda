"use client";

import { cn } from "@/lib/utils";
import type { EstVtasBarraProducto } from "@/lib/estVtasTypes";

interface Props {
  barras: EstVtasBarraProducto[];
  /** `codTienda` del producto seleccionado. */
  seleccionadoCod?: string | null;
  onSeleccionar?: (codTienda: string | null) => void;
  vacioPorDependencia?: string | null;
  contextoFiltro?: string | null;
  sinVentasCargadas?: boolean;
  className?: string;
}

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

const EST_VTAS_TOP_FILAS = 10;
const EST_VTAS_TOP_FILA_REM = 2;
const EST_VTAS_TOP_ALTO_CLASS = "h-3.5";

function anchoBarraPct(unidades: number, max: number): number {
  if (max <= 0 || unidades <= 0) return 0;
  return Math.max((unidades / max) * 100, 2);
}

/**
 * Top 10 productos (barras horizontales): etiqueta = descripción, eje X = Un. vendidas.
 * Título fijo píldora primary. Solo las barras son clicables.
 */
export default function EstVtasGraficoTopProductos({
  barras,
  seleccionadoCod = null,
  onSeleccionar,
  vacioPorDependencia = null,
  contextoFiltro = null,
  sinVentasCargadas = false,
  className,
}: Props) {
  const max = barras.reduce((m, b) => Math.max(m, b.unidades), 0);
  const vacio = barras.length === 0;
  const seleccionable = typeof onSeleccionar === "function";
  const plotHeightRem = EST_VTAS_TOP_FILAS * EST_VTAS_TOP_FILA_REM;

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
        <h2
          className={cn(
            "inline-flex h-6 max-w-full items-center rounded-full bg-primary px-3 py-0 shadow-sm",
            "text-[11px] font-bold uppercase tracking-wide text-primary-foreground"
          )}
        >
          Top 10 Productos
        </h2>
        {seleccionadoCod || contextoFiltro ? (
          <p className="text-center text-[10px] leading-tight text-muted-foreground">
            {contextoFiltro ? (
              <span className="block truncate font-semibold uppercase text-foreground">
                {contextoFiltro}
              </span>
            ) : null}
            {seleccionadoCod ? (
              <span className="block truncate font-semibold uppercase text-foreground">
                {`Selección: ${
                  barras.find((b) => b.codTienda === seleccionadoCod)?.etiqueta ??
                  seleccionadoCod
                }`}
              </span>
            ) : null}
          </p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "overflow-y-auto border-l border-b border-border pl-2 pr-1.5",
            vacio && "flex items-center justify-center"
          )}
          style={{ height: `${plotHeightRem}rem` }}
        >
          {vacio ? (
            <p className="max-w-[16rem] px-2 text-center text-xs text-muted-foreground">
              {vacioPorDependencia
                ? vacioPorDependencia
                : sinVentasCargadas
                  ? "No hay ventas cargadas. Subí datos en Carga de Datos y volvé a abrir este módulo."
                  : "No hay ventas para los filtros o el periodo seleccionados. Probá otra fecha con datos cargados."}
            </p>
          ) : (
            <div className="flex flex-col">
              {barras.map((b, index) => {
                const widthPct = anchoBarraPct(b.unidades, max);
                const activa = seleccionadoCod === b.codTienda;
                const fillClass =
                  b.unidades > 0 ? "bg-primary" : "bg-muted-foreground/20";
                const rank = index + 1;

                const pista = (
                  <div
                    className="min-w-0 flex-1 overflow-hidden rounded-full bg-muted/35"
                    aria-hidden={seleccionable ? true : undefined}
                  >
                    <div
                      className={cn(
                        "rounded-full transition-[width] duration-200 ease-out",
                        EST_VTAS_TOP_ALTO_CLASS,
                        fillClass
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                );

                return (
                  <div
                    key={b.codTienda}
                    className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)] items-center gap-x-2"
                    style={{ height: `${EST_VTAS_TOP_FILA_REM}rem` }}
                  >
                    <span
                      className="min-w-0 truncate pr-0.5 text-right text-[10px] font-medium uppercase leading-tight text-foreground"
                      title={`${rank}. ${b.etiqueta}`}
                    >
                      <span className="text-muted-foreground">{rank}. </span>
                      {b.etiqueta}
                    </span>

                    <div className="flex min-w-0 items-center gap-2">
                      {seleccionable ? (
                        <button
                          type="button"
                          aria-pressed={activa}
                          aria-label={`${rank}. ${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                          onClick={() => handleClick(b.codTienda)}
                          className={cn(
                            "est-vtas-barra-btn flex min-w-0 flex-1 items-center border-0 bg-transparent p-0",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
                            activa &&
                              "rounded-full ring-2 ring-primary/70 ring-offset-1 ring-offset-card"
                          )}
                        >
                          {pista}
                        </button>
                      ) : (
                        <div
                          className="flex min-w-0 flex-1 items-center"
                          role="img"
                          aria-label={`${rank}. ${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                        >
                          {pista}
                        </div>
                      )}

                      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-foreground">
                        {fmtUnidades(b.unidades)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-1.5 flex shrink-0 items-center justify-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-primary" aria-hidden />
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Un. Vendidas
          </span>
        </div>
      </div>
    </section>
  );
}
