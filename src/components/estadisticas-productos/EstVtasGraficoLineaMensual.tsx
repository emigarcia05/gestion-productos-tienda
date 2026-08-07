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
 * Línea temporal: eje X = 12 meses del año, eje Y = Un. vendidas
 * (filtradas por categorías de los gráficos 1 y 2).
 */
export default function EstVtasGraficoLineaMensual({
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

  const xPx = (mes: number) => PAD.left + ((mes - 1) / 11) * plotW;
  const yPx = (u: number) => PAD.top + plotH - (u / yMax) * plotH;

  const pathD = serie
    .map((p, i) => {
      const cmd = i === 0 ? "M" : "L";
      return `${cmd}${xPx(p.mes).toFixed(2)},${yPx(p.unidades).toFixed(2)}`;
    })
    .join(" ");

  const bloqueado = Boolean(vacioPorDependencia);
  const sinDatos = !bloqueado && maxData <= 0;

  return (
    <section
      className={cn(
        "flex min-h-[22rem] min-w-0 flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm",
        className
      )}
      aria-label={
        anio
          ? `Unidades vendidas por mes — ${anio}`
          : "Unidades vendidas por mes"
      }
    >
      <header className="flex shrink-0 flex-col items-center gap-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Un. Vendidas Por Mes{anio != null ? ` · ${anio}` : ""}
        </h2>
        <p className="text-[10px] text-muted-foreground">
          Eje X: Meses · Eje Y: Un. Vendidas
          {contextoFiltro ? (
            <span className="block truncate font-medium text-foreground">
              {contextoFiltro}
            </span>
          ) : null}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {bloqueado || (sinDatos && (sinVentasCargadas || !contextoFiltro)) ? (
          <div className="flex min-h-[14rem] flex-1 items-center justify-center border-l-2 border-b-2 border-border">
            <p className="max-w-[18rem] px-2 text-center text-xs text-muted-foreground">
              {vacioPorDependencia
                ? vacioPorDependencia
                : sinVentasCargadas
                  ? "No hay ventas cargadas. Subí datos en Carga de Datos y volvé a abrir este módulo."
                  : "Seleccioná categorías en los gráficos 1 y 2 para ver la evolución mensual."}
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
                  ? `Evolución mensual de unidades vendidas en ${anio}`
                  : "Evolución mensual de unidades vendidas"
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
                return (
                  <text
                    key={`x-${p.mes}`}
                    x={xPx(p.mes)}
                    y={VIEW_H - 8}
                    textAnchor="middle"
                    className={
                      marcado ? "fill-foreground font-semibold" : "fill-muted-foreground"
                    }
                    fontSize={9}
                  >
                    {etiquetaMesCortoEstPorProd(p.mes)}
                  </text>
                );
              })}

              <path
                d={pathD}
                fill="none"
                className="stroke-primary"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {serie.map((p) => (
                <circle
                  key={`pt-${p.mes}`}
                  cx={xPx(p.mes)}
                  cy={yPx(p.unidades)}
                  r={mesMarca === p.mes ? 4 : 3}
                  className="fill-primary"
                >
                  <title>
                    {etiquetaMesCortoEstPorProd(p.mes)}
                    {anio != null ? ` ${anio}` : ""}: {fmtUnidades(p.unidades)}
                  </title>
                </circle>
              ))}
            </svg>
            {sinDatos ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
                Sin ventas en este año para la selección actual.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
