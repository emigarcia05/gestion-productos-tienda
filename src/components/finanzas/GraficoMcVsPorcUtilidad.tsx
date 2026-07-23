"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
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

export type OpcionFormaPagoGraficoMc = {
  id: string;
  nombre: string;
};

interface Props {
  series: SerieGraficoMcVsPorcUtilidad[];
  /** PORC. UTILIDAD actual del filtro; si null, no se dibuja la marca vertical. */
  porcUtilidadMarca: number | null;
  /** Cambia con TERMINAL / TIPO COMPROBANTE / PORC. UTILIDAD / CX / descuentos. */
  revisionFiltros: string;
  metrica: MetricaGraficoMcMargenContribucion;
  onMetricaChange: (metrica: MetricaGraficoMcMargenContribucion) => void;
  opcionesFormaPago: OpcionFormaPagoGraficoMc[];
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

function MultiSelectFormasPagoGrafico({
  opciones,
  selectedIds,
  onChange,
}: {
  opciones: OpcionFormaPagoGraficoMc[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => opciones.filter((o) => selectedSet.has(o.id)),
    [opciones, selectedSet]
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  const label =
    opciones.length === 0
      ? "SIN FORMAS DE PAGO"
      : selectedItems.length === 0
        ? "FORMAS DE PAGO"
        : selectedItems.length === 1
          ? selectedItems[0]!.nombre
          : `${selectedItems.length} FORMAS`;

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        disabled={opciones.length === 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Formas de pago del gráfico"
        className={cn(
          "input-filtro-unificado flex h-10 w-full items-center justify-between gap-2 text-left text-xs font-semibold",
          selectedItems.length === 0 && "text-muted-foreground"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open && opciones.length > 0 ? (
        <div
          className="absolute top-full left-0 z-50 mt-1 max-h-48 min-w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
          aria-multiselectable="true"
        >
          {opciones.map((item) => {
            const checked = selectedSet.has(item.id);
            return (
              <label
                key={item.id}
                role="option"
                aria-selected={checked}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs font-medium hover:bg-muted",
                  checked && "bg-muted"
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-primary"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function GraficoMcVsPorcUtilidad({
  series,
  porcUtilidadMarca,
  revisionFiltros,
  metrica,
  onMetricaChange,
  opcionesFormaPago,
  formasSeleccionadas,
  onFormasSeleccionadasChange,
  className,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const etiquetaEjeY = metrica === "MC_PONDERADO" ? "M.C PONDERADO" : "M.C";

  const { paths, xToPx, yToPx, ticksX, ticksY, marcas, yBottom } = useMemo(() => {
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

    return {
      paths: pathsLocal,
      xToPx: xPx,
      yToPx: yPx,
      ticksX: ticksXLocal,
      ticksY: ticksYLocal,
      marcas: marcasLocal,
      yBottom: PAD.top + plotH,
    };
  }, [series, porcUtilidadMarca]);

  const marcaVerticalY =
    marcas.length > 0 ? Math.min(...marcas.map((m) => m.y)) : null;

  const tituloGrafico =
    metrica === "MC_PONDERADO"
      ? 'RELACIÓN "PORC. UTILIDAD / M.C. PONDERADO"'
      : 'RELACIÓN "PORC. UTILIDAD / M.C."';

  return (
    <div
      className={cn(
        "flex min-h-[15rem] w-full flex-col overflow-visible rounded-md border border-border bg-card",
        className
      )}
    >
      <p className="shrink-0 border-b border-border px-3 py-2 text-center text-sm font-bold text-foreground">
        {tituloGrafico}
      </p>
      <div className="flex min-h-[14rem] flex-1">
      <div className="flex w-44 shrink-0 flex-col gap-2 border-r border-border p-2">
        <MultiSelectFormasPagoGrafico
          opciones={opcionesFormaPago}
          selectedIds={formasSeleccionadas}
          onChange={onFormasSeleccionadasChange}
        />
        <Select
          value={metrica}
          onValueChange={(value) =>
            onMetricaChange(value as MetricaGraficoMcMargenContribucion)
          }
        >
          <SelectTrigger
            className="input-filtro-unificado h-10 w-full text-xs font-semibold"
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
            <SelectItem value="MC">M.C</SelectItem>
            <SelectItem value="MC_PONDERADO">M.C PONDERADO</SelectItem>
          </SelectContent>
        </Select>
        {series.length > 1 ? (
          <ul className="mt-auto flex max-h-20 flex-col gap-1 overflow-y-auto">
            {series.map((serie) => (
              <li
                key={serie.id}
                className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-foreground"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: serie.color }}
                  aria-hidden
                />
                <span className="truncate">{serie.etiqueta}</span>
              </li>
            ))}
          </ul>
        ) : null}
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
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
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
