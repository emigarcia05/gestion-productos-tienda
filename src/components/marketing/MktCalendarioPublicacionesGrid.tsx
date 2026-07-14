"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  construirVentanaCincoSemanas,
  desplazarLunesSemanas,
  etiquetaRangoVentanaCincoSemanas,
  lunesSemanaActualArgentina,
  MKT_CALENDARIO_DIAS_SEMANA,
} from "@/lib/mktCalendarioPublicaciones";
import { cn } from "@/lib/utils";

/**
 * Grilla 5 semanas × 7 días (LUN–DOM). La 1.ª fila es la semana ancla;
 * al cargar, ancla = semana actual (Argentina). Navegación ±1 semana.
 */
export default function MktCalendarioPublicacionesGrid() {
  const [lunesAncla, setLunesAncla] = useState(() => lunesSemanaActualArgentina());

  const semanas = useMemo(
    () => construirVentanaCincoSemanas(lunesAncla),
    [lunesAncla]
  );
  const etiquetaRango = useMemo(
    () => etiquetaRangoVentanaCincoSemanas(lunesAncla),
    [lunesAncla]
  );

  const esSemanaActual = lunesAncla === lunesSemanaActualArgentina();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-8 pb-6 pt-2">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          aria-label="Semana anterior"
          onClick={() => setLunesAncla((prev) => desplazarLunesSemanas(prev, -1))}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <p className="text-sm font-semibold tabular-nums text-foreground">{etiquetaRango}</p>
          <Button
            type="button"
            variant={esSemanaActual ? "outline" : "default"}
            size="sm"
            className="h-8 px-3"
            disabled={esSemanaActual}
            onClick={() => setLunesAncla(lunesSemanaActualArgentina())}
          >
            Ir A Esta Semana
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          aria-label="Semana siguiente"
          onClick={() => setLunesAncla((prev) => desplazarLunesSemanas(prev, 1))}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card"
        role="grid"
        aria-label="Calendario de publicaciones"
      >
        <div className="grid min-w-[48rem] grid-cols-7 border-b border-border bg-primary">
          {MKT_CALENDARIO_DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              role="columnheader"
              className="px-2 py-2 text-center text-xs font-bold tracking-wide text-primary-foreground"
            >
              {dia}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {semanas.map((semana) => (
            <div
              key={semana.lunesIso}
              role="row"
              className="grid min-h-[5.5rem] grid-cols-7 border-b border-border last:border-b-0"
            >
              {semana.dias.map((celda) => (
                <div
                  key={celda.isoYmd}
                  role="gridcell"
                  aria-label={celda.isoYmd}
                  className={cn(
                    "relative flex min-h-[5.5rem] flex-col border-r border-border p-2 last:border-r-0",
                    celda.delMesActual ? "bg-primary/8" : "bg-card",
                    celda.esHoy && "ring-2 ring-inset ring-primary"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                      celda.esHoy
                        ? "bg-primary text-primary-foreground"
                        : celda.delMesActual
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {celda.diaMes}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
