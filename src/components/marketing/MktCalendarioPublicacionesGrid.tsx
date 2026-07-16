"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import MktRedSocialIcon from "@/components/marketing/MktRedSocialIcon";
import {
  construirSemanasDelMes,
  MKT_CALENDARIO_DIAS_SEMANA,
  type MktCalendarioMesAnio,
} from "@/lib/mktCalendarioPublicaciones";
import { addDaysToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import {
  evaluarMktPublicacionObjsCliente,
  type MktPublicacionObjItem,
} from "@/lib/mktPublicacionesObj";
import {
  filtrarPublicacionesPorMesAnio,
  filtrarPublicacionesPorRangoIsoYmd,
  type MktCuadroMandoSemanaFiltro,
} from "@/lib/mktPublicacionesEstadisticas";
import { TEXT_SUCCESS_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const GRID_COLS_CLASS = "grid-cols-[repeat(7,minmax(0,1fr))_2.75rem]";

/**
 * Grilla 5 semanas × 7 días + columna OBJ. del mes elegido (LUN–DOM).
 * La columna OBJ. indica si se cumplieron todos los objetivos SEMANALES de esa fila.
 */
export default function MktCalendarioPublicacionesGrid({
  publicaciones,
  objetivos,
  onSeleccionarDia,
  mesVista,
  semanaSeleccionada,
}: {
  publicaciones: MktPublicacionCalendarioItem[];
  objetivos: MktPublicacionObjItem[];
  onSeleccionarDia?: (fechaIso: string) => void;
  mesVista: MktCalendarioMesAnio;
  semanaSeleccionada: MktCuadroMandoSemanaFiltro;
}) {
  const semanas = useMemo(() => construirSemanasDelMes(mesVista), [mesVista]);

  const objetivosSemanales = useMemo(
    () => objetivos.filter((o) => o.periodo === "SEMANAL"),
    [objetivos]
  );

  const porFecha = useMemo(() => {
    const map = new Map<string, MktPublicacionCalendarioItem[]>();
    for (const p of publicaciones) {
      const list = map.get(p.fechaIso) ?? [];
      list.push(p);
      map.set(p.fechaIso, list);
    }
    return map;
  }, [publicaciones]);

  const cumplimientoPorSemana = useMemo(() => {
    const map = new Map<number, boolean | null>();
    for (const semana of semanas) {
      if (objetivosSemanales.length === 0) {
        map.set(semana.numero, null);
        continue;
      }
      const domingo = addDaysToIsoYmdArgentina(semana.lunesIso, 6);
      const pubsSemana = filtrarPublicacionesPorRangoIsoYmd(
        publicaciones,
        semana.lunesIso,
        domingo
      );
      const evals = evaluarMktPublicacionObjsCliente(
        objetivosSemanales,
        pubsSemana,
        "SEMANAL"
      );
      map.set(
        semana.numero,
        evals.length > 0 && evals.every((e) => e.cumplido)
      );
    }
    return map;
  }, [semanas, objetivosSemanales, publicaciones]);

  const cumplimientoMensual = useMemo((): boolean | null => {
    const objetivosMensuales = objetivos.filter((o) => o.periodo === "MENSUAL");
    if (objetivosMensuales.length === 0) return null;
    const publicacionesMes = filtrarPublicacionesPorMesAnio(
      publicaciones,
      mesVista.mes,
      mesVista.anio
    );
    const evaluaciones = evaluarMktPublicacionObjsCliente(
      objetivosMensuales,
      publicacionesMes,
      "MENSUAL"
    );
    return evaluaciones.length > 0 && evaluaciones.every((e) => e.cumplido);
  }, [objetivos, publicaciones, mesVista]);

  return (
    <div className="flex shrink-0 flex-col gap-2 px-8 pb-2 pt-2">
      <div
        className="overflow-auto rounded-lg border border-border bg-card"
        role="grid"
        aria-label="Calendario de publicaciones"
      >
        <div className={cn("grid min-w-[48rem] border-b border-border bg-primary", GRID_COLS_CLASS)}>
          {MKT_CALENDARIO_DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              role="columnheader"
              className="px-1.5 py-1.5 text-center text-[11px] font-bold tracking-wide text-primary-foreground"
            >
              {dia}
            </div>
          ))}
          <div
            role="columnheader"
            className="border-l border-primary-foreground/30 px-1 py-1.5 text-center text-[11px] font-bold tracking-wide text-primary-foreground"
            title="Objetivos semanales"
          >
            OBJ.
          </div>
        </div>

        <div className="flex flex-col">
          {semanas.map((semana) => {
            const esSemanaSeleccionada =
              semanaSeleccionada !== "TODAS" && semana.numero === semanaSeleccionada;
            const cumplimiento = cumplimientoPorSemana.get(semana.numero) ?? null;
            return (
              <div
                key={semana.lunesIso}
                role="row"
                className={cn(
                  "grid min-h-[3.25rem] border-b border-border last:border-b-0",
                  GRID_COLS_CLASS,
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
                        "relative flex min-h-[3.25rem] flex-col gap-0.5 border-r border-border p-1",
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
                            const nombres = item.redesNombres.join(", ") || "SIN RED";
                            return item.redesNombres.map((redNombre, idx) => (
                              <span
                                key={`${item.id}-${item.redIds[idx] ?? idx}`}
                                title={`${nombres}: ${item.publicacion.slice(0, 80)} · CONTENIDO: ${terminado ? "SI" : "NO"}`}
                                className={cn(
                                  "inline-flex size-5 items-center justify-center rounded-md",
                                  terminado
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-primary bg-card text-primary"
                                )}
                                aria-label={
                                  terminado
                                    ? `${redNombre}, contenido terminado`
                                    : `${redNombre}, contenido planificado`
                                }
                              >
                                <MktRedSocialIcon redNombre={redNombre} className="size-3" />
                              </span>
                            ));
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div
                  role="gridcell"
                  className={cn(
                    "flex min-h-[3.25rem] items-center justify-center border-l border-border px-1",
                    esSemanaSeleccionada ? "bg-primary/20" : "bg-muted/30"
                  )}
                  aria-label={
                    cumplimiento === null
                      ? `Semana ${semana.numero}: sin objetivos semanales`
                      : cumplimiento
                        ? `Semana ${semana.numero}: objetivos semanales cumplidos`
                        : `Semana ${semana.numero}: objetivos semanales incumplidos`
                  }
                >
                  {cumplimiento === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : cumplimiento ? (
                    <Check
                      className={cn("size-5 shrink-0", TEXT_SUCCESS_CLASS)}
                      aria-hidden
                      strokeWidth={2.5}
                    />
                  ) : (
                    <X
                      className="size-5 shrink-0 text-destructive"
                      aria-hidden
                      strokeWidth={2.5}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div
            role="row"
            className={cn(
              "grid min-h-[3.25rem] border-t border-border bg-muted/30",
              GRID_COLS_CLASS
            )}
          >
            <div
              role="gridcell"
              className="col-span-7 flex min-h-[3.25rem] items-center justify-center gap-2 px-3 text-center text-xs font-bold uppercase tracking-wide text-foreground"
              aria-label={
                cumplimientoMensual === null
                  ? "Objetivos Mensuales: sin objetivos"
                  : cumplimientoMensual
                    ? "Objetivos Mensuales: cumplidos"
                    : "Objetivos Mensuales: incumplidos"
              }
            >
              <span>Objetivos Mensuales</span>
              {cumplimientoMensual === null ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : cumplimientoMensual ? (
                <Check
                  className={cn("size-5 shrink-0", TEXT_SUCCESS_CLASS)}
                  aria-hidden
                  strokeWidth={2.5}
                />
              ) : (
                <X
                  className="size-5 shrink-0 text-destructive"
                  aria-hidden
                  strokeWidth={2.5}
                />
              )}
            </div>
            <div
              role="gridcell"
              className="flex min-h-[3.25rem] items-center justify-center border-l border-border px-1"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
