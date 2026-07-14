"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  construirVentanaCincoSemanas,
  desplazarMesAnio,
  etiquetaMesAnioMayusculas,
  lunesInicioMesArgentina,
  lunesSemanaActualArgentina,
  mesAnioActualArgentina,
  MKT_CALENDARIO_DIAS_SEMANA,
  type MktCalendarioMesAnio,
} from "@/lib/mktCalendarioPublicaciones";
import { cn } from "@/lib/utils";

/**
 * Grilla 5 semanas × 7 días (LUN–DOM).
 * Al cargar: 1.ª fila = semana actual (AR). Navegación ←/→ = ±1 mes (1.ª fila = inicio del mes).
 */
export default function MktCalendarioPublicacionesGrid() {
  const [mesVista, setMesVista] = useState<MktCalendarioMesAnio>(() => mesAnioActualArgentina());
  const [lunesAncla, setLunesAncla] = useState(() => lunesSemanaActualArgentina());

  const hoyMes = mesAnioActualArgentina();
  const semanas = useMemo(
    () =>
      construirVentanaCincoSemanas(lunesAncla, {
        mesVista: mesVista.mes,
        anioVista: mesVista.anio,
      }),
    [lunesAncla, mesVista]
  );
  const etiquetaMes = useMemo(() => etiquetaMesAnioMayusculas(mesVista), [mesVista]);

  const lunesEstaSemana = lunesSemanaActualArgentina();
  const lunesEsteMes = lunesInicioMesArgentina(hoyMes.anio, hoyMes.mes);
  const esEstaSemana =
    lunesAncla === lunesEstaSemana &&
    mesVista.mes === hoyMes.mes &&
    mesVista.anio === hoyMes.anio;
  const esEsteMes =
    lunesAncla === lunesEsteMes &&
    mesVista.mes === hoyMes.mes &&
    mesVista.anio === hoyMes.anio;

  function irMes(delta: number) {
    const next = desplazarMesAnio(mesVista, delta);
    setMesVista(next);
    setLunesAncla(lunesInicioMesArgentina(next.anio, next.mes));
  }

  function irAEstaSemana() {
    const actual = mesAnioActualArgentina();
    setMesVista(actual);
    setLunesAncla(lunesSemanaActualArgentina());
  }

  function irAEsteMes() {
    const actual = mesAnioActualArgentina();
    setMesVista(actual);
    setLunesAncla(lunesInicioMesArgentina(actual.anio, actual.mes));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-8 pb-6 pt-2">
      <div className="relative flex shrink-0 items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={esEstaSemana ? "outline" : "default"}
            size="sm"
            className="h-8 px-3"
            disabled={esEstaSemana}
            onClick={irAEstaSemana}
          >
            Ir A Esta Semana
          </Button>
          <Button
            type="button"
            variant={esEsteMes ? "outline" : "default"}
            size="sm"
            className="h-8 px-3"
            disabled={esEsteMes}
            onClick={irAEsteMes}
          >
            Este Mes
          </Button>
        </div>

        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold tracking-wide text-foreground">
          {etiquetaMes}
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Mes anterior"
            onClick={() => irMes(-1)}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Mes siguiente"
            onClick={() => irMes(1)}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
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
