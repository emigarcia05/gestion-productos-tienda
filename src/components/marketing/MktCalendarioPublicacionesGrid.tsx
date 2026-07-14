"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MktRedSocialIcon from "@/components/marketing/MktRedSocialIcon";
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
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import { cn } from "@/lib/utils";

/**
 * Grilla 5 semanas × 7 días (LUN–DOM), alto compacto para dejar espacio al cuadro de mando.
 */
export default function MktCalendarioPublicacionesGrid({
  publicaciones,
  onSeleccionarDia,
  mesVista,
  onMesVistaChange,
}: {
  publicaciones: MktPublicacionCalendarioItem[];
  onSeleccionarDia?: (fechaIso: string) => void;
  mesVista: MktCalendarioMesAnio;
  onMesVistaChange: (next: MktCalendarioMesAnio, lunesAnclaIso: string) => void;
}) {
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

  const porFecha = useMemo(() => {
    const map = new Map<string, MktPublicacionCalendarioItem[]>();
    for (const p of publicaciones) {
      const list = map.get(p.fechaIso) ?? [];
      list.push(p);
      map.set(p.fechaIso, list);
    }
    return map;
  }, [publicaciones]);

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

  function setVista(nextMes: MktCalendarioMesAnio, nextLunes: string) {
    setLunesAncla(nextLunes);
    onMesVistaChange(nextMes, nextLunes);
  }

  function irMes(delta: number) {
    const next = desplazarMesAnio(mesVista, delta);
    setVista(next, lunesInicioMesArgentina(next.anio, next.mes));
  }

  function irAEstaSemana() {
    const actual = mesAnioActualArgentina();
    setVista(actual, lunesSemanaActualArgentina());
  }

  function irAEsteMes() {
    const actual = mesAnioActualArgentina();
    setVista(actual, lunesInicioMesArgentina(actual.anio, actual.mes));
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 px-8 pb-2 pt-2">
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
            variant="default"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Mes anterior"
            onClick={() => irMes(-1)}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Mes siguiente"
            onClick={() => irMes(1)}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <div
        className="overflow-auto rounded-lg border border-border bg-card"
        role="grid"
        aria-label="Calendario de publicaciones"
      >
        <div className="grid min-w-[48rem] grid-cols-7 border-b border-border bg-primary">
          {MKT_CALENDARIO_DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              role="columnheader"
              className="px-1.5 py-1.5 text-center text-[11px] font-bold tracking-wide text-primary-foreground"
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
              className="grid min-h-[3.25rem] grid-cols-7 border-b border-border last:border-b-0"
            >
              {semana.dias.map((celda) => {
                const items = porFecha.get(celda.isoYmd) ?? [];
                const clickable = Boolean(onSeleccionarDia);
                return (
                  <div
                    key={celda.isoYmd}
                    role="gridcell"
                    aria-label={celda.isoYmd}
                    className={cn(
                      "relative flex min-h-[3.25rem] flex-col gap-0.5 border-r border-border p-1 last:border-r-0",
                      celda.delMesActual ? "bg-primary/8" : "bg-card",
                      celda.esHoy && "ring-2 ring-inset ring-primary",
                      clickable && "cursor-pointer hover:bg-primary/15"
                    )}
                    onClick={() => {
                      if (!clickable) return;
                      onSeleccionarDia?.(celda.isoYmd);
                    }}
                    onKeyDown={(e) => {
                      if (!clickable) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSeleccionarDia?.(celda.isoYmd);
                      }
                    }}
                    tabIndex={clickable ? 0 : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        celda.esHoy
                          ? "bg-primary text-primary-foreground"
                          : celda.delMesActual
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {celda.diaMes}
                    </span>
                    {items.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-0.5" aria-label="Publicaciones del día">
                        {items.map((item) => {
                          const terminado = item.contenidoCreado;
                          return (
                            <span
                              key={item.id}
                              title={`${item.redNombre}: ${item.publicacion.slice(0, 80)} · CONTENIDO: ${terminado ? "SI" : "NO"}`}
                              className={cn(
                                "inline-flex size-5 items-center justify-center rounded-md",
                                terminado
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-primary bg-card text-primary"
                              )}
                              aria-label={
                                terminado
                                  ? `${item.redNombre}, contenido terminado`
                                  : `${item.redNombre}, contenido planificado`
                              }
                            >
                              <MktRedSocialIcon redNombre={item.redNombre} className="size-3" />
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
