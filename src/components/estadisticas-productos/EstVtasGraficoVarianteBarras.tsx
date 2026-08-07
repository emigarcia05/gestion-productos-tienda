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
  EST_VTAS_EJE_Y_OPTIONS,
  etiquetaEstVtasEjeY,
  type EstVtasBarraDimension,
  type EstVtasEjeY,
} from "@/lib/estVtasTypes";

interface Props {
  barras: EstVtasBarraDimension[];
  ejeY: EstVtasEjeY;
  onEjeYChange: (eje: EstVtasEjeY) => void;
  /** Categoría del eje Y seleccionada (clic en fila). */
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
  className?: string;
}

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/**
 * Barras horizontales: eje Y = dimensión elegida, eje X = Un. vendidas.
 * Título = Select de dimensión. Filas clicables si hay `onSeleccionar`.
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
  className,
}: Props) {
  const max = barras.reduce((m, b) => Math.max(m, b.unidades), 0);
  const vacio = barras.length === 0;
  const labelEjeY = etiquetaEstVtasEjeY(ejeY);
  const seleccionable = typeof onSeleccionar === "function";

  function handleFilaClick(etiqueta: string) {
    if (!onSeleccionar) return;
    onSeleccionar(seleccionada === etiqueta ? null : etiqueta);
  }

  return (
    <section
      className={cn(
        "flex min-h-[22rem] min-w-0 flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label={`Unidades vendidas por ${labelEjeY.toLowerCase()}`}
    >
      <header className="flex shrink-0 flex-col items-center gap-0.5">
        <Select
          value={ejeY}
          onValueChange={(v) => onEjeYChange(v as EstVtasEjeY)}
        >
          <SelectTrigger
            size="sm"
            aria-label={ariaLabelDimension}
            className={cn(
              "h-auto w-auto max-w-full border-0 bg-transparent px-2 py-1 shadow-none",
              "text-xs font-semibold uppercase tracking-wide text-foreground",
              "hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring/40",
              "[&_svg]:opacity-70"
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
        <p className="text-[10px] text-muted-foreground">
          Eje Y: {labelEjeY} · Eje X: Un. Vendidas
          {seleccionada ? (
            <span className="block truncate font-medium text-foreground">
              Selección: {seleccionada}
            </span>
          ) : null}
          {contextoFiltro ? (
            <span className="block truncate font-medium text-foreground">
              {contextoFiltro}
            </span>
          ) : null}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex min-h-[14rem] flex-1 flex-col gap-2 overflow-y-auto border-l-2 border-b-2 border-border py-2 pl-3 pr-1",
            vacio && "items-center justify-center"
          )}
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
            barras.map((b) => {
              const pct = max > 0 ? Math.round((b.unidades / max) * 100) : 0;
              const widthPct = b.unidades > 0 ? Math.max(pct, 2) : 0;
              const activa = seleccionada === b.etiqueta;
              const filaClass = cn(
                "grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-sm px-1 py-0.5",
                seleccionable &&
                  "cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                activa && "bg-primary/10"
              );

              if (seleccionable) {
                return (
                  <button
                    key={b.etiqueta}
                    type="button"
                    className={cn(filaClass, "w-full text-left")}
                    aria-pressed={activa}
                    onClick={() => handleFilaClick(b.etiqueta)}
                  >
                    <span
                      className="truncate text-right text-[11px] font-medium leading-tight text-foreground"
                      title={b.etiqueta}
                    >
                      {b.etiqueta}
                    </span>
                    <div
                      className="h-5 w-full rounded-sm bg-muted/30"
                      aria-hidden
                    >
                      <div
                        className={cn(
                          "h-full rounded-sm",
                          b.unidades > 0 ? "bg-primary" : "bg-muted-foreground/20"
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-right text-[11px] tabular-nums text-foreground">
                      {fmtUnidades(b.unidades)}
                    </span>
                  </button>
                );
              }

              return (
                <div key={b.etiqueta} className={filaClass}>
                  <span
                    className="truncate text-right text-[11px] font-medium leading-tight text-foreground"
                    title={b.etiqueta}
                  >
                    {b.etiqueta}
                  </span>
                  <div
                    className="h-5 w-full rounded-sm bg-muted/30"
                    role="img"
                    aria-label={`${b.etiqueta}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-sm",
                        b.unidades > 0 ? "bg-primary" : "bg-muted-foreground/20"
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-right text-[11px] tabular-nums text-foreground">
                    {fmtUnidades(b.unidades)}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-1 shrink-0 text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          ← Un. Vendidas
        </p>
      </div>
    </section>
  );
}
