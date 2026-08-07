"use client";

import { etiquetaMesCortoEstPorProd } from "@/lib/estPorProdPeriodo";
import type { EstVtasPuntoMensual } from "@/lib/estVtasTypes";
import { cn } from "@/lib/utils";

interface Props {
  puntos: EstVtasPuntoMensual[];
  /** Año de la serie (del filtro FECHA). */
  anio: number | null;
  /** Mes del filtro FECHA (1–12); se marca en el eje X. */
  mesMarca?: number | null;
  /** Texto de contexto (filtros de gráficos 1 y 2). */
  contextoFiltro?: string | null;
  /**
   * Mensaje cuando faltan selecciones en gráficos padre.
   * Si no hay, se usan los vacíos de ventas/filtros.
   */
  vacioPorDependencia?: string | null;
  sinVentasCargadas?: boolean;
  className?: string;
}

const PAD = { top: 16, right: 12, bottom: 28, left: 44 };
const VIEW_W = 560;
const VIEW_H = 240;
/** Fracción del slot mensual ocupada por la barra (el resto es aire). */
const BAR_SLOT_RATIO = 0.58;

function fmtUnidades(n: number): string {
  return n.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function ticksEjeY(maxVal: number): number[] {
  if (!Number.isFinite(maxVal) || maxVal <= 0) return [0];
  const rough = maxVal / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step =
    (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const hi = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= hi + step * 1e-9; v += step) {
    ticks.push(v);
  }
  return ticks;
}

/**
 * Barras verticales temporales: eje X = 12 meses del año, eje Y = Un. vendidas
 * (filtradas por categorías de los gráficos 1 y 2).
 */
export default function EstVtasGraficoBarrasMensual({
  puntos,
  anio,
  mesMarca = null,
  contextoFiltro = null,
  vacioPorDependencia = null,
  sinVentasCargadas = false,
  className,
}: Props) {
  const serie =
    puntos.length === 12
      ? puntos
      : Array.from({ length: 12 }, (_, i) => {
          const mes = i + 1;
          return puntos.find((p) => p.mes === mes) ?? { mes, unidades: 0 };
        });

  const maxData = serie.reduce((m, p) => Math.max(m, p.unidades), 0);
  const yTicks = ticksEjeY(maxData);
  const yMax = yTicks[yTicks.length - 1] ?? 1;
  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;
  const slotW = plotW / 12;
  const barW = slotW * BAR_SLOT_RATIO;

  const xCenter = (mes: number) => PAD.left + (mes - 0.5) * slotW;
  const yPx = (u: number) => PAD.top + plotH - (u / yMax) * plotH;

  const bloqueado = Boolean(vacioPorDependencia);
  const sinDatos = !bloqueado && maxData <= 0;

  return (
    <section
      className={cn(
        "flex min-h-[22rem] min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label={
        anio
          ? `Unidades vendidas por mes — ${anio}`
          : "Unidades vendidas por mes"
      }
    >
      <header className="flex shrink-0 flex-col items-center gap-0.5">
        <h2
          className={cn(
            "inline-flex h-6 max-w-full items-center rounded-full bg-primary px-3 py-0 shadow-sm",
            "text-[11px] font-bold uppercase tracking-wide text-primary-foreground"
          )}
        >
          Un. Vendidas Por Mes{anio != null ? ` · ${anio}` : ""}
        </h2>
        {contextoFiltro ? (
          <p className="text-center text-[10px] leading-tight text-muted-foreground">
            <span className="block truncate font-semibold uppercase text-foreground">
              {contextoFiltro}
            </span>
          </p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {bloqueado || (sinDatos && sinVentasCargadas) ? (
          <div className="flex min-h-[14rem] flex-1 items-center justify-center border-l border-b border-border">
            <p className="max-w-[18rem] px-2 text-center text-xs text-muted-foreground">
              {vacioPorDependencia
                ? vacioPorDependencia
                : sinVentasCargadas
                  ? "No hay ventas cargadas. Subí datos en Carga de Datos y volvé a abrir este módulo."
                  : "No hay ventas para los filtros o el periodo seleccionados."}
            </p>
          </div>
        ) : (
          <div className="relative min-h-[14rem] flex-1">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="h-full w-full"
              role="img"
              aria-label={
                anio
                  ? `Barras mensuales de unidades vendidas en ${anio}`
                  : "Barras mensuales de unidades vendidas"
              }
            >
              {yTicks.map((t) => (
                <g key={`y-${t}`}>
                  <line
                    x1={PAD.left}
                    x2={VIEW_W - PAD.right}
                    y1={yPx(t)}
                    y2={yPx(t)}
                    className="stroke-border"
                    strokeWidth={1}
                    strokeDasharray={t === 0 ? undefined : "3 3"}
                  />
                  <text
                    x={PAD.left - 6}
                    y={yPx(t)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontSize={9}
                  >
                    {fmtUnidades(t)}
                  </text>
                </g>
              ))}

              {serie.map((p) => {
                const marcado = mesMarca === p.mes;
                const cx = xCenter(p.mes);
                const barH =
                  p.unidades > 0
                    ? Math.max((p.unidades / yMax) * plotH, 2)
                    : 0;
                const barY = PAD.top + plotH - barH;
                const barX = cx - barW / 2;

                return (
                  <g key={`mes-${p.mes}`}>
                    {barH > 0 ? (
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={barH}
                        rx={3}
                        ry={3}
                        className={
                          marcado ? "fill-primary" : "fill-primary/75"
                        }
                      >
                        <title>
                          {etiquetaMesCortoEstPorProd(p.mes)}
                          {anio != null ? ` ${anio}` : ""}:{" "}
                          {fmtUnidades(p.unidades)}
                        </title>
                      </rect>
                    ) : null}
                    <text
                      x={cx}
                      y={VIEW_H - 8}
                      textAnchor="middle"
                      className={
                        marcado
                          ? "fill-foreground font-semibold"
                          : "fill-muted-foreground"
                      }
                      fontSize={9}
                    >
                      {etiquetaMesCortoEstPorProd(p.mes)}
                    </text>
                  </g>
                );
              })}
            </svg>
            {sinDatos ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
                Sin ventas en este año para la selección actual.
              </p>
            ) : null}
          </div>
        )}
        <div className="mt-1.5 flex shrink-0 items-center justify-center gap-1.5">
          <span
            className="inline-block h-2.5 w-1.5 rounded-sm bg-primary"
            aria-hidden
          />
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Un. Vendidas
          </span>
        </div>
      </div>
    </section>
  );
}
