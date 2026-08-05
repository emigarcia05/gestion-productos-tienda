"use client";

import { cn } from "@/lib/utils";
import type { EstVtasBarraVariante } from "@/lib/estVtasTypes";

interface Props {
  barras: EstVtasBarraVariante[];
  className?: string;
}

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/**
 * Barras horizontales: eje Y = Variante, eje X = Un. vendidas.
 * Posición típica: margen superior derecho del dashboard Estadísticas Vtas.
 */
export default function EstVtasGraficoVarianteBarras({ barras, className }: Props) {
  const max = barras.reduce((m, b) => Math.max(m, b.unidades), 0);

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label="Unidades vendidas por variante"
    >
      <header className="shrink-0 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Un. Vendidas Por Variante
        </h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Eje Y: Variante · Eje X: Un. Vendidas
        </p>
      </header>

      {barras.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No hay ventas para los filtros seleccionados.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {barras.map((b) => {
            const pct = max > 0 ? Math.round((b.unidades / max) * 100) : 0;
            const widthPct = b.unidades > 0 ? Math.max(pct, 2) : 0;
            return (
              <div
                key={b.variante}
                className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-2"
              >
                <span
                  className="truncate text-right text-[11px] font-medium leading-tight text-foreground"
                  title={b.variante}
                >
                  {b.variante}
                </span>
                <div
                  className="h-5 w-full rounded-sm bg-muted/30"
                  role="img"
                  aria-label={`${b.variante}: ${fmtUnidades(b.unidades)} unidades vendidas`}
                >
                  <div
                    className={cn(
                      "h-full rounded-sm",
                      b.unidades > 0 ? "bg-[#0072BB]" : "bg-muted-foreground/20"
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="text-right text-[11px] tabular-nums text-foreground">
                  {fmtUnidades(b.unidades)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
