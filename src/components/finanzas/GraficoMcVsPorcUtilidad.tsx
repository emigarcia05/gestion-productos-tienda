"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MC_GRAFICO_PORC_UTILIDAD_MAX,
  MC_GRAFICO_PORC_UTILIDAD_MIN,
  type PuntoMcVsPorcUtilidad,
} from "@/lib/finAnaMargenContribucion";

interface Props {
  puntos: PuntoMcVsPorcUtilidad[];
  /** PORC. UTILIDAD actual del filtro; si null, no se dibuja la marca vertical. */
  porcUtilidadMarca: number | null;
  /** M.C (%) en el PORC. UTILIDAD marcado (intersección con la curva). */
  mcPctMarca: number | null;
  className?: string;
  etiquetaFormaPago?: string;
}

const PAD = { top: 16, right: 16, bottom: 36, left: 48 };
const VIEW_W = 720;
const VIEW_H = 220;

function fmtPct(n: number): string {
  return `${Math.round(n).toLocaleString("es-AR")}%`;
}

export default function GraficoMcVsPorcUtilidad({
  puntos,
  porcUtilidadMarca,
  mcPctMarca,
  className,
  etiquetaFormaPago = "3 CUOTAS",
}: Props) {
  const gradId = useId().replace(/:/g, "");

  const { pathD, xToPx, yToPx, ticksX, ticksY, marca } = useMemo(() => {
    const validos = puntos.filter(
      (p): p is PuntoMcVsPorcUtilidad & { mcPct: number } =>
        p.mcPct != null && Number.isFinite(p.mcPct)
    );
    const plotW = VIEW_W - PAD.left - PAD.right;
    const plotH = VIEW_H - PAD.top - PAD.bottom;
    const xMin = MC_GRAFICO_PORC_UTILIDAD_MIN;
    const xMax = MC_GRAFICO_PORC_UTILIDAD_MAX;

    const mcValues = validos.map((p) => p.mcPct);
    if (
      porcUtilidadMarca != null &&
      mcPctMarca != null &&
      Number.isFinite(mcPctMarca)
    ) {
      mcValues.push(mcPctMarca);
    }

    let yLo = mcValues.length > 0 ? Math.min(...mcValues) : 0;
    let yHi = mcValues.length > 0 ? Math.max(...mcValues) : 100;
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

    let d = "";
    for (let i = 0; i < validos.length; i++) {
      const p = validos[i];
      const cmd = i === 0 ? "M" : "L";
      d += `${cmd}${xPx(p.porcUtilidadPct).toFixed(2)},${yPx(p.mcPct).toFixed(2)} `;
    }

    const ticksXLocal = [20, 50, 100, 150, 200];
    const ySpan = yHi - yLo;
    const ticksYLocal = [0, 0.25, 0.5, 0.75, 1].map((t) => yLo + ySpan * t);

    let marcaLocal: {
      x: number;
      yTop: number;
      yBottom: number;
      label: string;
    } | null = null;

    if (
      porcUtilidadMarca != null &&
      mcPctMarca != null &&
      Number.isFinite(mcPctMarca) &&
      porcUtilidadMarca >= xMin &&
      porcUtilidadMarca <= xMax
    ) {
      const x = xPx(porcUtilidadMarca);
      marcaLocal = {
        x,
        yTop: yPx(mcPctMarca),
        yBottom: PAD.top + plotH,
        label: fmtPct(porcUtilidadMarca),
      };
    }

    return {
      pathD: d.trim(),
      xToPx: xPx,
      yToPx: yPx,
      ticksX: ticksXLocal,
      ticksY: ticksYLocal,
      marca: marcaLocal,
    };
  }, [puntos, porcUtilidadMarca, mcPctMarca]);

  if (puntos.length === 0) {
    return (
      <div
        className={cn(
          "flex h-52 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground",
          className
        )}
      >
        No hay datos para el gráfico
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-52 min-h-[13rem] w-full flex-col rounded-md border border-border bg-card px-3 py-2",
        className
      )}
    >
      <p className="shrink-0 text-xs font-medium text-muted-foreground">
        M.C vs PORC. UTILIDAD · {etiquetaFormaPago}
      </p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label={`Gráfico de línea: M.C (${etiquetaFormaPago}) según PORC. UTILIDAD de ${MC_GRAFICO_PORC_UTILIDAD_MIN}% a ${MC_GRAFICO_PORC_UTILIDAD_MAX}%`}
      >
        <defs>
          <linearGradient id={`mc-fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Ejes */}
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
              className="fill-muted-foreground"
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
            className="fill-muted-foreground"
            fontSize={10}
          >
            {fmtPct(x)}
          </text>
        ))}

        <text
          x={(PAD.left + VIEW_W - PAD.right) / 2}
          y={VIEW_H - 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={10}
        >
          PORC. UTILIDAD
        </text>
        <text
          x={12}
          y={(PAD.top + VIEW_H - PAD.bottom) / 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={10}
          transform={`rotate(-90 12 ${(PAD.top + VIEW_H - PAD.bottom) / 2})`}
        >
          M.C
        </text>

        {pathD ? (
          <>
            <path
              d={`${pathD} L${xToPx(MC_GRAFICO_PORC_UTILIDAD_MAX).toFixed(2)},${(VIEW_H - PAD.bottom).toFixed(2)} L${xToPx(MC_GRAFICO_PORC_UTILIDAD_MIN).toFixed(2)},${(VIEW_H - PAD.bottom).toFixed(2)} Z`}
              fill={`url(#mc-fill-${gradId})`}
            />
            <path
              d={pathD}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {marca ? (
          <g>
            {/* Línea vertical desde el eje X hasta la curva */}
            <line
              x1={marca.x}
              y1={marca.yBottom}
              x2={marca.x}
              y2={marca.yTop}
              stroke="var(--primary)"
              strokeWidth={1.75}
              strokeDasharray="5 4"
            />
            <circle
              cx={marca.x}
              cy={marca.yTop}
              r={4.5}
              fill="var(--primary)"
              stroke="var(--card)"
              strokeWidth={1.5}
            />
            <text
              x={marca.x}
              y={marca.yTop - 10}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={11}
              fontWeight={600}
            >
              {marca.label}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
