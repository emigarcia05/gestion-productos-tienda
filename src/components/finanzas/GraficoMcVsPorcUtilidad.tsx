"use client";

import { useId, useMemo } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  ETIQUETA_CORTA_METRICA_GRAFICO_MC,
  ETIQUETA_METRICA_GRAFICO_MC,
  FIN_ANA_MC_METRICAS_GRAFICO,
  MC_GRAFICO_PORC_UTILIDAD_MAX,
  MC_GRAFICO_PORC_UTILIDAD_MIN,
  type MetricaGraficoMcMargenContribucion,
  type PuntoMcVsPorcUtilidad,
} from "@/lib/finAnaMargenContribucion";

export type SerieGraficoMcVsPorcUtilidad = {
  id: string;
  etiqueta: string;
  color: string;
  puntos: PuntoMcVsPorcUtilidad[];
  /** Valor Y en el PORC. UTILIDAD marcado (null si no hay marca). */
  valorMarca: number | null;
};

export type FilaFormaPagoGraficoMc = {
  id: string;
  nombre: string;
  color: string;
  /** Valor de la métrica (%) en el PORC. UTILIDAD actual; null si no aplica. */
  valorPct: number | null;
};

interface Props {
  series: SerieGraficoMcVsPorcUtilidad[];
  /** PORC. UTILIDAD actual del filtro; si null, no se dibuja la marca vertical. */
  porcUtilidadMarca: number | null;
  /** Cambia con TERMINAL / TIPO COMPROBANTE / PORC. UTILIDAD / CX / descuentos. */
  revisionFiltros: string;
  metrica: MetricaGraficoMcMargenContribucion;
  onMetricaChange: (metrica: MetricaGraficoMcMargenContribucion) => void;
  filasFormaPago: FilaFormaPagoGraficoMc[];
  formasSeleccionadas: string[];
  onFormasSeleccionadasChange: (ids: string[]) => void;
  className?: string;
}

const PAD = { top: 20, right: 16, bottom: 36, left: 48 };
const VIEW_W = 720;
const VIEW_H = 220;

function fmtPct(n: number): string {
  return `${Math.round(n).toLocaleString("es-AR")}%`;
}

function pathFromPuntos(
  puntos: PuntoMcVsPorcUtilidad[],
  xPx: (x: number) => number,
  yPx: (y: number) => number
): string {
  const validos = puntos.filter(
    (p): p is PuntoMcVsPorcUtilidad & { mcPct: number } =>
      p.mcPct != null && Number.isFinite(p.mcPct)
  );
  let d = "";
  for (let i = 0; i < validos.length; i++) {
    const p = validos[i];
    const cmd = i === 0 ? "M" : "L";
    d += `${cmd}${xPx(p.porcUtilidadPct).toFixed(2)},${yPx(p.mcPct).toFixed(2)} `;
  }
  return d.trim();
}

export default function GraficoMcVsPorcUtilidad({
  series,
  porcUtilidadMarca,
  revisionFiltros,
  metrica,
  onMetricaChange,
  filasFormaPago,
  formasSeleccionadas,
  onFormasSeleccionadasChange,
  className,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const etiquetaEjeY = ETIQUETA_METRICA_GRAFICO_MC[metrica];
  const etiquetaColumna = ETIQUETA_CORTA_METRICA_GRAFICO_MC[metrica];
  const selectedSet = useMemo(
    () => new Set(formasSeleccionadas),
    [formasSeleccionadas]
  );

  const idsFormas = useMemo(
    () => filasFormaPago.map((fila) => fila.id),
    [filasFormaPago]
  );

  const todasSeleccionadas =
    idsFormas.length > 0 && idsFormas.every((id) => selectedSet.has(id));

  const tituloGrafico = `RELACIÓN "PORC. UTILIDAD / ${etiquetaEjeY}"`;

  function toggleForma(id: string) {
    if (selectedSet.has(id)) {
      onFormasSeleccionadasChange(formasSeleccionadas.filter((x) => x !== id));
      return;
    }
    onFormasSeleccionadasChange([...formasSeleccionadas, id]);
  }

  function toggleTodasFormas() {
    if (todasSeleccionadas) {
      onFormasSeleccionadasChange([]);
      return;
    }
    onFormasSeleccionadasChange(idsFormas);
  }

  const { paths, xToPx, yToPx, ticksX, ticksY, marcas, yBottom, marcaVerticalY } =
    useMemo(() => {
      const plotW = VIEW_W - PAD.left - PAD.right;
      const plotH = VIEW_H - PAD.top - PAD.bottom;
      const xMin = MC_GRAFICO_PORC_UTILIDAD_MIN;
      const xMax = MC_GRAFICO_PORC_UTILIDAD_MAX;

      const yValues: number[] = [];
      for (const serie of series) {
        for (const p of serie.puntos) {
          if (p.mcPct != null && Number.isFinite(p.mcPct)) yValues.push(p.mcPct);
        }
        if (serie.valorMarca != null && Number.isFinite(serie.valorMarca)) {
          yValues.push(serie.valorMarca);
        }
      }

      let yLo = yValues.length > 0 ? Math.min(...yValues) : 0;
      let yHi = yValues.length > 0 ? Math.max(...yValues) : 100;
      if (yLo === yHi) {
        yLo -= 5;
        yHi += 5;
      }
      const padY = Math.max(2, (yHi - yLo) * 0.08);
      yLo -= padY;
      yHi += padY;

      const xPx = (x: number) =>
        PAD.left + ((x - xMin) / (xMax - xMin)) * plotW;
      const yPx = (y: number) =>
        PAD.top + ((yHi - y) / (yHi - yLo)) * plotH;

      const pathsLocal = series.map((serie) => ({
        id: serie.id,
        color: serie.color,
        d: pathFromPuntos(serie.puntos, xPx, yPx),
      }));

      const ticksXLocal = [20, 50, 100, 150, 200];
      const ySpan = yHi - yLo;
      const ticksYLocal = [0, 0.25, 0.5, 0.75, 1].map((t) => yLo + ySpan * t);

      const marcasLocal: {
        id: string;
        color: string;
        x: number;
        y: number;
        label: string;
      }[] = [];

      if (
        porcUtilidadMarca != null &&
        porcUtilidadMarca >= xMin &&
        porcUtilidadMarca <= xMax
      ) {
        const x = xPx(porcUtilidadMarca);
        for (const serie of series) {
          if (serie.valorMarca == null || !Number.isFinite(serie.valorMarca)) {
            continue;
          }
          marcasLocal.push({
            id: serie.id,
            color: serie.color,
            x,
            y: yPx(serie.valorMarca),
            label: fmtPct(serie.valorMarca),
          });
        }
      }

      const yBottomLocal = PAD.top + plotH;
      const marcaVerticalYLocal =
        marcasLocal.length > 0
          ? Math.min(...marcasLocal.map((m) => m.y))
          : null;

      return {
        paths: pathsLocal,
        xToPx: xPx,
        yToPx: yPx,
        ticksX: ticksXLocal,
        ticksY: ticksYLocal,
        marcas: marcasLocal,
        yBottom: yBottomLocal,
        marcaVerticalY: marcaVerticalYLocal,
      };
    }, [series, porcUtilidadMarca]);

  return (
    <div
      className={cn(
        "flex min-h-[14rem] w-full flex-col overflow-visible rounded-md border border-border bg-card",
        className
      )}
    >
      <div className="flex min-h-[14rem] flex-1">
        <div className="flex w-56 shrink-0 flex-col gap-2 border-r border-border p-2">
          <Select
            value={metrica}
            onValueChange={(value) =>
              onMetricaChange(value as MetricaGraficoMcMargenContribucion)
            }
          >
            <SelectTrigger
              className="input-filtro-unificado h-10 w-full shrink-0 text-xs font-semibold"
              aria-label="Métrica del gráfico"
            >
              <SelectValue placeholder="MÉTRICA" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              className="select-content-filtro"
            >
              {FIN_ANA_MC_METRICAS_GRAFICO.map((opcion) => (
                <SelectItem key={opcion} value={opcion}>
                  {ETIQUETA_METRICA_GRAFICO_MC[opcion]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="w-8 px-1 py-1.5 text-center font-bold text-foreground">
                    <span className="sr-only">GRAFICAR</span>
                    <div className="flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idsFormas.length === 0}
                        onClick={toggleTodasFormas}
                        className={cn(
                          "tabla-check-toggle !size-4 shrink-0 rounded-[2px] border border-[#0072bb] !bg-white p-0 text-[#0072bb] hover:!bg-white hover:text-[#0072bb]",
                          todasSeleccionadas && "[&_svg]:!text-[#0072bb]"
                        )}
                        aria-pressed={todasSeleccionadas}
                        aria-label={
                          todasSeleccionadas
                            ? "Deseleccionar todas las formas de pago"
                            : "Seleccionar todas las formas de pago"
                        }
                        title={
                          todasSeleccionadas
                            ? "Deseleccionar todas"
                            : "Seleccionar todas"
                        }
                      >
                        {todasSeleccionadas ? (
                          <Check
                            className={TABLE_ROW_ACTION_ICON_CLASS}
                            aria-hidden
                          />
                        ) : null}
                      </Button>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 text-left font-bold text-foreground">
                    FORMA
                  </th>
                  <th className="w-14 px-1.5 py-1.5 text-right font-bold text-foreground">
                    {etiquetaColumna}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filasFormaPago.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-3 text-center text-muted-foreground"
                    >
                      Sin formas de pago
                    </td>
                  </tr>
                ) : (
                  filasFormaPago.map((fila) => {
                    const checked = selectedSet.has(fila.id);
                    return (
                      <tr
                        key={fila.id}
                        className={cn(
                          "border-b border-border last:border-b-0",
                          checked && "bg-primary/5"
                        )}
                      >
                        <td className="px-1 py-1 text-center align-middle">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={checked}
                            onChange={() => toggleForma(fila.id)}
                            aria-label={`Graficar ${fila.nombre}`}
                          />
                        </td>
                        <td className="min-w-0 px-1.5 py-1 align-middle">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {checked ? (
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: fila.color }}
                                aria-hidden
                              />
                            ) : null}
                            <span className="truncate font-medium text-foreground">
                              {fila.nombre}
                            </span>
                          </span>
                        </td>
                        <td className="px-1.5 py-1 text-right align-middle tabular-nums text-foreground">
                          {fila.valorPct == null
                            ? "—"
                            : fmtPct(fila.valorPct)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 flex-1 px-2 py-1" key={revisionFiltros}>
          {series.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Seleccioná al menos una forma de pago
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="h-full w-full"
              role="img"
              aria-label={tituloGrafico}
            >
              <defs>
                <linearGradient
                  id={`mc-fill-${gradId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="0.18"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>

              <line
                x1={PAD.left}
                y1={PAD.top}
                x2={PAD.left}
                y2={VIEW_H - PAD.bottom}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <line
                x1={PAD.left}
                y1={VIEW_H - PAD.bottom}
                x2={VIEW_W - PAD.right}
                y2={VIEW_H - PAD.bottom}
                stroke="var(--border)"
                strokeWidth={1}
              />

              {ticksY.map((y) => (
                <g key={`y-${y}`}>
                  <line
                    x1={PAD.left}
                    y1={yToPx(y)}
                    x2={VIEW_W - PAD.right}
                    y2={yToPx(y)}
                    stroke="var(--border)"
                    strokeOpacity={0.45}
                    strokeDasharray="3 4"
                  />
                  <text
                    x={PAD.left - 8}
                    y={yToPx(y)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-foreground"
                    fontSize={10}
                  >
                    {fmtPct(y)}
                  </text>
                </g>
              ))}

              {ticksX.map((x) => (
                <text
                  key={`x-${x}`}
                  x={xToPx(x)}
                  y={VIEW_H - PAD.bottom + 16}
                  textAnchor="middle"
                  className="fill-foreground"
                  fontSize={10}
                >
                  {fmtPct(x)}
                </text>
              ))}

              <text
                x={(PAD.left + VIEW_W - PAD.right) / 2}
                y={VIEW_H - 4}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={10}
              >
                PORC. UTILIDAD
              </text>
              <text
                x={12}
                y={(PAD.top + VIEW_H - PAD.bottom) / 2}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={10}
                transform={`rotate(-90 12 ${(PAD.top + VIEW_H - PAD.bottom) / 2})`}
              >
                {etiquetaEjeY}
              </text>

              {series.length === 1 && paths[0]?.d ? (
                <path
                  d={`${paths[0].d} L${xToPx(MC_GRAFICO_PORC_UTILIDAD_MAX).toFixed(2)},${yBottom.toFixed(2)} L${xToPx(MC_GRAFICO_PORC_UTILIDAD_MIN).toFixed(2)},${yBottom.toFixed(2)} Z`}
                  fill={`url(#mc-fill-${gradId})`}
                />
              ) : null}

              {paths.map((path) =>
                path.d ? (
                  <path
                    key={path.id}
                    d={path.d}
                    fill="none"
                    stroke={path.color}
                    strokeWidth={2.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null
              )}

              {marcas.length > 0 && marcaVerticalY != null ? (
                <g>
                  <line
                    x1={marcas[0]!.x}
                    y1={yBottom}
                    x2={marcas[0]!.x}
                    y2={marcaVerticalY}
                    stroke="var(--primary)"
                    strokeWidth={1.75}
                    strokeDasharray="5 4"
                  />
                  {marcas.map((marca, index) => (
                    <g key={marca.id}>
                      <circle
                        cx={marca.x}
                        cy={marca.y}
                        r={4.5}
                        fill={marca.color}
                        stroke="var(--card)"
                        strokeWidth={1.5}
                      />
                      <text
                        x={marca.x}
                        y={marca.y - 10 - index * 12}
                        textAnchor="middle"
                        className="fill-foreground"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {marca.label}
                      </text>
                    </g>
                  ))}
                </g>
              ) : null}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
