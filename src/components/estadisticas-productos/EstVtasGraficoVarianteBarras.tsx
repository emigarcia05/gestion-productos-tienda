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
  /** True si no hay ninguna fila en `est_por_prod` (nada cargado). */
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
 * Barras horizontales: eje Y = dimensión elegida, eje X = Un. vendidas.
 * El título es un Select para elegir la dimensión del eje Y.
 * Posición: margen superior izquierdo del dashboard Estadísticas Vtas.
 */
export default function EstVtasGraficoVarianteBarras({
  barras,
  ejeY,
  onEjeYChange,
  sinVentasCargadas = false,
  className,
}: Props) {
  const max = barras.reduce((m, b) => Math.max(m, b.unidades), 0);
  const vacio = barras.length === 0;
  const labelEjeY = etiquetaEstVtasEjeY(ejeY);

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
            aria-label="Dimensión del eje Y"
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
              {sinVentasCargadas
                ? "No hay ventas cargadas. Subí datos en Carga de Datos y volvé a abrir este módulo."
                : "No hay ventas para los filtros o el periodo seleccionados. Probá otra fecha con datos cargados."}
            </p>
          ) : (
            barras.map((b) => {
              const pct = max > 0 ? Math.round((b.unidades / max) * 100) : 0;
              const widthPct = b.unidades > 0 ? Math.max(pct, 2) : 0;
              return (
                <div
                  key={b.etiqueta}
                  className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-2"
                >
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
