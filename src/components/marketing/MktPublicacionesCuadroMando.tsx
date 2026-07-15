"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import MktRedSocialIcon from "@/components/marketing/MktRedSocialIcon";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  desplazarMesAnio,
  etiquetaMesAnioMayusculas,
  type MktCalendarioMesAnio,
} from "@/lib/mktCalendarioPublicaciones";
import type {
  MktCuadroMandoSemanaFiltro,
  MktCuadroMandoStats,
  MktStatFila,
} from "@/lib/mktPublicacionesEstadisticas";
import { MKT_CUADRO_MANDO_SEMANAS } from "@/lib/mktPublicacionesEstadisticas";
import {
  textoIncumplimientoObjetivo,
  type MktPublicacionObjEvaluacion,
} from "@/lib/mktPublicacionesObj";
import { TEXT_SUCCESS_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function ColumnaStats({
  titulo,
  filas,
  mostrarIconoRed,
}: {
  titulo: string;
  filas: MktStatFila[];
  mostrarIconoRed?: boolean;
}) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-card"
      aria-label={titulo}
    >
      <header className="shrink-0 border-b border-border bg-primary px-3 py-2 text-center">
        <h3 className="text-xs font-bold uppercase tracking-wide text-primary-foreground">
          {titulo}
        </h3>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {filas.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">Sin datos</li>
        ) : (
          filas.map((fila) => (
            <li
              key={fila.id}
              className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
            >
              {mostrarIconoRed ? (
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <MktRedSocialIcon redNombre={fila.nombre} className="size-3.5" />
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {fila.nombre}
              </span>
              <span
                className={cn(
                  "tabular-nums text-sm font-semibold",
                  fila.cantidad > 0 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {fila.cantidad}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function ColumnaObjetivos({
  evaluaciones,
}: {
  evaluaciones: MktPublicacionObjEvaluacion[];
}) {
  const [openDetalle, setOpenDetalle] = useState(false);
  const cumplidos = evaluaciones.filter((e) => e.cumplido).length;
  const incumplidos = evaluaciones.filter((e) => !e.cumplido);
  const faltantes = incumplidos
    .map((e) => ({ id: e.id, texto: textoIncumplimientoObjetivo(e) }))
    .sort((a, b) => a.texto.localeCompare(b.texto, "es"));

  return (
    <>
      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-card"
        aria-label="Objetivos"
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-border bg-primary px-10 py-2 text-center">
          <h3 className="text-xs font-bold uppercase tracking-wide text-primary-foreground">
            Objetivos
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1/2 size-7 -translate-y-1/2 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            aria-label="Ver detalle de objetivos incumplidos"
            onClick={() => setOpenDetalle(true)}
          >
            <ListChecks className="size-4" aria-hidden />
          </Button>
        </header>
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {evaluaciones.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">
              Sin objetivos en este periodo
            </li>
          ) : (
            <>
              <li className="flex items-center gap-2 border-b border-border px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  CUMPLIDOS
                </span>
                <span
                  className={cn(
                    "tabular-nums text-sm font-semibold",
                    cumplidos > 0 ? TEXT_SUCCESS_CLASS : "text-muted-foreground"
                  )}
                >
                  {cumplidos}
                </span>
              </li>
              <li className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  INCUMPLIDOS
                </span>
                <span
                  className={cn(
                    "tabular-nums text-sm font-semibold",
                    incumplidos.length > 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {incumplidos.length}
                </span>
              </li>
            </>
          )}
        </ul>
      </section>

      <Dialog open={openDetalle} onOpenChange={setOpenDetalle}>
        <AppModal
          title="Objetivos Incumplidos"
          size="md"
          scrollBody
          hideBodyScrollbars
          actions={
            <Button type="button" variant="outline" onClick={() => setOpenDetalle(false)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <ModalMicroLabel>Incumplidos</ModalMicroLabel>
            {faltantes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {evaluaciones.length === 0
                  ? "No hay objetivos configurados para este periodo."
                  : "Todos los objetivos están cumplidos."}
              </p>
            ) : (
              <ul className="max-h-[min(20rem,50vh)] space-y-2 overflow-y-auto pr-1">
                {faltantes.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground"
                  >
                    {item.texto}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}

/** Tres columnas: Redes · Contenido · Objetivos. Selector mes + semana arriba. */
export default function MktPublicacionesCuadroMando({
  stats,
  evaluacionesObjetivos,
  mesVista,
  onMesVistaChange,
  semana,
  onSemanaChange,
}: {
  stats: MktCuadroMandoStats;
  evaluacionesObjetivos: MktPublicacionObjEvaluacion[];
  mesVista: MktCalendarioMesAnio;
  onMesVistaChange: (next: MktCalendarioMesAnio) => void;
  semana: MktCuadroMandoSemanaFiltro;
  onSemanaChange: (next: MktCuadroMandoSemanaFiltro) => void;
}) {
  const etiquetaMes = etiquetaMesAnioMayusculas(mesVista);

  return (
    <div
      className="flex shrink-0 flex-col gap-2 px-8 pb-2 pt-2"
      aria-label="Cuadro de mando de publicaciones"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Mes Obligatorios"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Mes Obligatorios
          </span>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Mes anterior"
            onClick={() => onMesVistaChange(desplazarMesAnio(mesVista, -1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold tracking-wide text-foreground">
            {etiquetaMes}
          </span>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Mes siguiente"
            onClick={() => onMesVistaChange(desplazarMesAnio(mesVista, 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Semana"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Semana
          </span>
          {MKT_CUADRO_MANDO_SEMANAS.map((op) => (
            <Button
              key={String(op.id)}
              type="button"
              size="sm"
              variant={semana === op.id ? "default" : "outline"}
              aria-pressed={semana === op.id}
              onClick={() => onSemanaChange(op.id)}
            >
              {op.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid min-h-[10rem] grid-cols-3 gap-3">
        <ColumnaStats titulo="Redes" filas={stats.redes} mostrarIconoRed />
        <ColumnaStats titulo="Contenido" filas={stats.contenido} />
        <ColumnaObjetivos evaluaciones={evaluacionesObjetivos} />
      </div>
    </div>
  );
}
