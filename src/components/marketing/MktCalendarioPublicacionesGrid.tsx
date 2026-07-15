"use client";

import { useMemo } from "react";
import MktRedSocialIcon from "@/components/marketing/MktRedSocialIcon";
import {
  construirSemanasDelMes,
  MKT_CALENDARIO_DIAS_SEMANA,
  type MktCalendarioMesAnio,
} from "@/lib/mktCalendarioPublicaciones";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import type { MktCuadroMandoSemanaFiltro } from "@/lib/mktPublicacionesEstadisticas";
import { cn } from "@/lib/utils";

/**
 * Grilla 5 semanas × 7 días del mes elegido (LUN–DOM).
 * Si hay una semana 1–5 seleccionada, esa fila se resalta.
 */
export default function MktCalendarioPublicacionesGrid({
  publicaciones,
  onSeleccionarDia,
  mesVista,
  semanaSeleccionada,
}: {
  publicaciones: MktPublicacionCalendarioItem[];
  onSeleccionarDia?: (fechaIso: string) => void;
  mesVista: MktCalendarioMesAnio;
  semanaSeleccionada: MktCuadroMandoSemanaFiltro;
}) {
  const semanas = useMemo(() => construirSemanasDelMes(mesVista), [mesVista]);

  const porFecha = useMemo(() => {
    const map = new Map<string, MktPublicacionCalendarioItem[]>();
    for (const p of publicaciones) {
      const list = map.get(p.fechaIso) ?? [];
      list.push(p);
      map.set(p.fechaIso, list);
    }
    return map;
  }, [publicaciones]);

  return (
    <div className="flex shrink-0 flex-col gap-2 px-8 pb-2 pt-2">
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
          {semanas.map((semana) => {
            const esSemanaSeleccionada =
              semanaSeleccionada !== "TODAS" && semana.numero === semanaSeleccionada;
            return (
              <div
                key={semana.lunesIso}
                role="row"
                className={cn(
                  "grid min-h-[3.25rem] grid-cols-7 border-b border-border last:border-b-0",
                  esSemanaSeleccionada && "bg-primary/15"
                )}
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
                        esSemanaSeleccionada
                          ? "bg-primary/20"
                          : celda.delMesActual
                            ? "bg-primary/8"
                            : "bg-card",
                        celda.esHoy && "ring-2 ring-inset ring-primary",
                        clickable && "cursor-pointer hover:bg-primary/25"
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
                            : celda.delMesActual || esSemanaSeleccionada
                              ? "text-foreground"
                              : "text-muted-foreground"
                        )}
                      >
                        {celda.diaMes}
                      </span>
                      {items.length > 0 ? (
                        <div
                          className="mt-auto flex flex-wrap gap-0.5"
                          aria-label="Publicaciones del día"
                        >
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
