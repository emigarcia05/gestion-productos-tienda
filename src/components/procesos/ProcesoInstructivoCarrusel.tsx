"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PasoProcesoInstructivo } from "@/lib/procesos-instructivos";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";

const PASO_NAV_SLOT_CLASS = "h-9 w-9 shrink-0 rounded-full";

const PASO_NAV_ARROW_ENABLED_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  PASO_NAV_SLOT_CLASS
);

/** Flecha deshabilitada: recuadro vacío, sin relleno, borde corporativo. */
const PASO_NAV_ARROW_DISABLED_CLASS = cn(
  PASO_NAV_SLOT_CLASS,
  "cursor-default border-2 border-[#0072BB] bg-transparent shadow-none hover:bg-transparent disabled:opacity-100"
);

const PASO_NUMERO_BASE_CLASS = cn(
  PASO_NAV_SLOT_CLASS,
  "flex items-center justify-center border-2 border-[#0072BB] text-sm font-semibold transition-colors"
);

const PASO_NUMERO_ACTUAL_CLASS = "bg-[#0072BB] text-white";
const PASO_NUMERO_ADJACENTE_CLASS = "bg-transparent text-black hover:bg-muted/30";

interface Props {
  titulo: string;
  pasos: readonly PasoProcesoInstructivo[];
  /** Reinicia al paso 1 cuando cambia (p. ej. id del proceso seleccionado). */
  resetKey?: string;
  className?: string;
}

function indicesPasosVisibles(actual: number, total: number): number[] {
  const indices: number[] = [];
  if (actual > 0) indices.push(actual - 1);
  indices.push(actual);
  if (actual < total - 1) indices.push(actual + 1);
  return indices;
}

export default function ProcesoInstructivoCarrusel({
  titulo,
  pasos,
  resetKey,
  className,
}: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const [imagenAmpliada, setImagenAmpliada] = useState(false);

  const paso = pasos[pasoActual];
  const indicesVisibles = useMemo(
    () => indicesPasosVisibles(pasoActual, pasos.length),
    [pasoActual, pasos.length]
  );

  useEffect(() => {
    queueMicrotask(() => {
      setPasoActual(0);
      setImagenAmpliada(false);
    });
  }, [resetKey]);

  useEffect(() => {
    setImagenAmpliada(false);
  }, [pasoActual]);

  if (!paso || pasos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este proceso no tiene pasos configurados.
      </p>
    );
  }

  const irAtras = () => setPasoActual((p) => (p > 0 ? p - 1 : p));
  const irAdelante = () => setPasoActual((p) => (p < pasos.length - 1 ? p + 1 : p));

  const puedeIrAtras = pasoActual > 0;
  const puedeIrAdelante = pasoActual < pasos.length - 1;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <h2 className="shrink-0 text-center text-base font-semibold text-foreground">{titulo}</h2>

      <div
        className="flex shrink-0 items-center justify-center gap-3"
        role="group"
        aria-label="Navegación por pasos"
      >
        {puedeIrAtras ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={PASO_NAV_ARROW_ENABLED_CLASS}
            onClick={irAtras}
            aria-label="Paso anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <span
            className={PASO_NAV_ARROW_DISABLED_CLASS}
            role="presentation"
            aria-hidden
          />
        )}

        <div className="flex items-center justify-center gap-2">
          {indicesVisibles.map((i) => {
            const esActual = i === pasoActual;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPasoActual(i)}
                aria-label={`Ir al paso ${i + 1}`}
                aria-current={esActual ? "step" : undefined}
                className={cn(
                  PASO_NUMERO_BASE_CLASS,
                  esActual ? PASO_NUMERO_ACTUAL_CLASS : PASO_NUMERO_ADJACENTE_CLASS
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {puedeIrAdelante ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={PASO_NAV_ARROW_ENABLED_CLASS}
            onClick={irAdelante}
            aria-label="Paso siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <span
            className={PASO_NAV_ARROW_DISABLED_CLASS}
            role="presentation"
            aria-hidden
          />
        )}
      </div>

      <div
        className="flex h-28 shrink-0 flex-col items-center justify-center gap-1 overflow-y-auto rounded-md border border-border bg-muted/20 px-3 py-2 text-center"
        aria-live="polite"
      >
        <p className="shrink-0 text-sm font-semibold text-foreground">{paso.titulo}</p>
        <p className="text-sm leading-relaxed text-foreground">{paso.texto}</p>
      </div>

      {paso.img ? (
        <>
          <button
            type="button"
            className="flex min-h-0 w-full min-w-0 flex-1 basis-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_img]:max-h-full [&_img]:max-w-full [&_img]:bg-transparent [&_span]:bg-transparent"
            onClick={() => setImagenAmpliada(true)}
            aria-label="Ampliar imagen del paso"
          >
            <Image
              src={paso.img}
              alt={paso.texto}
              width={1920}
              height={1080}
              className="h-auto w-auto max-h-full max-w-full cursor-zoom-in bg-transparent object-contain"
              sizes="(max-width: 1200px) 75vw, 900px"
            />
          </button>

          <Dialog open={imagenAmpliada} onOpenChange={setImagenAmpliada}>
            <DialogContent
              className="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-dvw max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 overflow-hidden rounded-none border-0 bg-black/95 p-0 shadow-none [&_[data-slot=dialog-close]]:border-white/40 [&_[data-slot=dialog-close]]:bg-black/50 [&_[data-slot=dialog-close]]:text-white"
              showCloseButton
            >
              <DialogTitle className="sr-only">
                {titulo} — paso {pasoActual + 1}
              </DialogTitle>
              <div className="relative h-full w-full min-h-0">
                <Image
                  src={paso.img}
                  alt={paso.texto}
                  fill
                  className="object-contain object-center"
                  sizes="100vw"
                  priority
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10">
          <p className="text-sm text-muted-foreground">Este paso no incluye imagen.</p>
        </div>
      )}
    </div>
  );
}
