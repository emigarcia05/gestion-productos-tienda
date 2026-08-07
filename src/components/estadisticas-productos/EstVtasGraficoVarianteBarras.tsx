"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EST_VTAS_DESGLOSE_OPTIONS,
  EST_VTAS_EJE_Y_OPTIONS,
  etiquetaEstVtasEjeY,
  type EstVtasBarraDimension,
  type EstVtasDesglose,
  type EstVtasEjeY,
} from "@/lib/estVtasTypes";

interface Props {
  barras: EstVtasBarraDimension[];
  ejeY: EstVtasEjeY;
  onEjeYChange: (eje: EstVtasEjeY) => void;
  /** Categoría del eje Y seleccionada (clic en la barra). */
  seleccionada?: string | null;
  onSeleccionar?: (etiqueta: string | null) => void;
  /**
   * Mensaje cuando no hay barras por falta de selección en el gráfico padre
   * (gráfico dependiente). Si no hay, se usan los vacíos de ventas/filtros.
   */
  vacioPorDependencia?: string | null;
  /** Texto de contexto bajo el subtítulo (ej. filtro del gráfico 1). */
  contextoFiltro?: string | null;
  /** True si no hay ninguna fila en `est_por_prod` (nada cargado). */
  sinVentasCargadas?: boolean;
  /** Aria del Select de dimensión (distinguir gráfico 1 vs 2). */
  ariaLabelDimension?: string;
  /** Desglose del gráfico 1 (`ninguno` | `sucursal`). Solo si se pasa `onDesgloseChange`. */
  desglose?: EstVtasDesglose;
  onDesgloseChange?: (desglose: EstVtasDesglose) => void;
  /**
   * True cuando el gráfico 1 está mostrando barras por sucursal
   * (categoría del eje Y ya elegida + desglose = sucursal).
   */
  desgloseSucursalActivo?: boolean;
  /** Volver del desglose por sucursal a la lista de categorías. */
  onVolverCategoria?: () => void;
  className?: string;
}

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/** Filas visibles en el viewport del eje Y; el resto scrollea. */
const EST_VTAS_BARRAS_FILAS_VISIBLES = 8;
/** Alto de cada fila (barra + aire). */
const EST_VTAS_BARRAS_FILA_REM = 1.75;

/**
 * Barras horizontales: eje Y = dimensión elegida, eje X = Un. vendidas.
 * Título = Select píldora primary. Solo las barras son clicables (no las etiquetas).
 * Layout: 15% etiquetas · 85% barras (+ valor); viewport de 8 filas con scroll.
 */
export default function EstVtasGraficoVarianteBarras({
  barras,
  ejeY,
  onEjeYChange,
  seleccionada = null,
  onSeleccionar,
  vacioPorDependencia = null,
  contextoFiltro = null,
  sinVentasCargadas = false,
  ariaLabelDimension = "Dimensión del eje Y",
  desglose = "ninguno",
  onDesgloseChange,
  desgloseSucursalActivo = false,
  onVolverCategoria,
  className,
}: Props) {
  const max = barras.reduce((m, b) => Math.max(m, b.unidades), 0);
  const vacio = barras.length === 0;
  const labelEjeY = etiquetaEstVtasEjeY(ejeY);
  const seleccionable = typeof onSeleccionar === "function";
  const plotHeightRem = EST_VTAS_BARRAS_FILAS_VISIBLES * EST_VTAS_BARRAS_FILA_REM;
  const conDesglose = typeof onDesgloseChange === "function";

  function handleBarraClick(etiqueta: string) {
    if (!onSeleccionar) return;
    onSeleccionar(seleccionada === etiqueta ? null : etiqueta);
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label={
        desgloseSucursalActivo
          ? `Unidades vendidas por sucursal — ${labelEjeY.toLowerCase()}`
          : `Unidades vendidas por ${labelEjeY.toLowerCase()}`
      }
    >
      <header className="flex shrink-0 flex-col items-center gap-1">
        <Select
          value={ejeY}
          onValueChange={(v) => onEjeYChange(v as EstVtasEjeY)}
        >
          <SelectTrigger
            size="sm"
            aria-label={ariaLabelDimension}
            className={cn(
              "h-auto w-auto max-w-full gap-1.5 rounded-full border-0 bg-primary px-4 py-1.5 shadow-sm",
              "text-[11px] font-bold uppercase tracking-wide text-primary-foreground",
              "hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40",
              "[&_svg]:size-3.5 [&_svg]:opacity-100 [&_svg]:text-primary-foreground"
            )}
          >
            <SelectValue placeholder="Un. Vendidas Por Variante" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="center"
            className="select-content-filtro"
          >
            {EST_VTAS_EJE_Y_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {`Un. Vendidas Por ${opt.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {conDesglose ? (
          <Select
            value={desglose}
            onValueChange={(v) => onDesgloseChange(v as EstVtasDesglose)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Desglose del gráfico 1"
              className={cn(
                "h-auto w-auto max-w-full gap-1 border-0 bg-transparent px-2 py-0.5 shadow-none",
                "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                "hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring/40",
                "[&_svg]:size-3 [&_svg]:opacity-70"
              )}
            >
              <SelectValue placeholder="Desglose" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="center"
              className="select-content-filtro"
            >
              {EST_VTAS_DESGLOSE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {`Desglose: ${opt.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {seleccionada || contextoFiltro || desgloseSucursalActivo ? (
          <p className="text-center text-[10px] leading-tight text-muted-foreground">
            {contextoFiltro ? (
              <span className="block truncate font-semibold uppercase text-foreground">
                {contextoFiltro}
              </span>
            ) : null}
            {seleccionada ? (
              <span className="block truncate font-semibold uppercase text-foreground">
                {desgloseSucursalActivo
                  ? `Sucursal: ${seleccionada}`
                  : `Selección: ${seleccionada}`}
              </span>
            ) : null}
            {desgloseSucursalActivo && onVolverCategoria ? (
              <button
                type="button"
                onClick={onVolverCategoria}
                className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-primary underline-offset-2 hover:underline"
              >
                Volver A {labelEjeY}
              </button>
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
              {barras.map((b) => {
                const pct = max > 0 ? Math.round((b.unidades / max) * 100) : 0;
                const widthPct = b.unidades > 0 ? Math.max(pct, 2) : 0;
                const activa = seleccionada === b.etiqueta;

                return (
                  <div
                    key={b.etiqueta}
                    className="grid grid-cols-[minmax(0,15%)_minmax(0,1fr)] items-center gap-x-2"
                    style={{ height: `${EST_VTAS_BARRAS_FILA_REM}rem` }}
                  >
                    <span
                      className="min-w-0 truncate pr-0.5 text-right text-[11px] font-medium uppercase leading-tight text-foreground"
                      title={b.etiqueta}
                    >
                      {b.etiqueta}
                    </span>

                    <div className="flex min-w-0 items-center gap-2">
                      {seleccionable ? (
                        <button
                          type="button"
                          aria-pressed={activa}
                          aria-label={`${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                          onClick={() => handleBarraClick(b.etiqueta)}
                          className={cn(
                            "relative h-5 min-w-0 flex-1 rounded-full bg-muted/40 p-0",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
                            activa &&
                              "ring-2 ring-primary/70 ring-offset-1 ring-offset-card"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full",
                              b.unidades > 0
                                ? "bg-primary"
                                : "bg-muted-foreground/20",
                              activa && "bg-primary"
                            )}
                            style={{ width: `${widthPct}%` }}
                          />
                        </button>
                      ) : (
                        <div
                          className="relative h-5 min-w-0 flex-1 rounded-full bg-muted/40"
                          role="img"
                          aria-label={`${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                        >
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full",
                              b.unidades > 0
                                ? "bg-primary"
                                : "bg-muted-foreground/20"
                            )}
                            style={{ width: `${widthPct}%` }}
                          />
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
