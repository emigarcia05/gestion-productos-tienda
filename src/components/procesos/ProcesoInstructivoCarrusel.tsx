"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatoTituloProcesos, type PasoProcesoInstructivo } from "@/lib/procesos-instructivos";

const PASO_NAV_SLOT_CLASS = "h-9 w-9 shrink-0";

/** Flecha sin destino: oculta pero conserva el espacio del layout. */
const PASO_NAV_ARROW_HIDDEN_CLASS = "invisible pointer-events-none";

const PASO_NUMERO_SLOT_RESERVADO_CLASS = cn(PASO_NAV_SLOT_CLASS, PASO_NAV_ARROW_HIDDEN_CLASS);

interface Props {
  titulo: string;
  pasos: readonly PasoProcesoInstructivo[];
  /** Reinicia al paso 1 cuando cambia (p. ej. id del proceso seleccionado). */
  resetKey?: string;
  className?: string;
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
  const indicePasoAnterior = puedeIrAtras ? pasoActual - 1 : null;
  const indicePasoSiguiente = puedeIrAdelante ? pasoActual + 1 : null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <h2 className="shrink-0 text-center text-base font-semibold capitalize text-foreground">
        {formatoTituloProcesos(titulo)}
      </h2>

      <div
        className="flex shrink-0 items-center justify-center gap-3"
        role="group"
        aria-label="Navegación por pasos"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "proceso-paso-nav-flecha",
            PASO_NAV_SLOT_CLASS,
            !puedeIrAtras && PASO_NAV_ARROW_HIDDEN_CLASS
          )}
          onClick={irAtras}
          disabled={!puedeIrAtras}
          aria-label="Paso anterior"
          aria-hidden={!puedeIrAtras}
          tabIndex={puedeIrAtras ? 0 : -1}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center justify-center gap-2">
          {indicePasoAnterior !== null ? (
            <button
              type="button"
              onClick={() => setPasoActual(indicePasoAnterior)}
              aria-label={`Ir al paso ${indicePasoAnterior + 1}`}
              className={cn("proceso-paso-nav-numero proceso-paso-nav-numero--adyacente", PASO_NAV_SLOT_CLASS)}
            >
              {indicePasoAnterior + 1}
            </button>
          ) : (
            <span className={PASO_NUMERO_SLOT_RESERVADO_CLASS} aria-hidden />
          )}

          <button
            type="button"
            aria-label={`Paso ${pasoActual + 1}`}
            aria-current="step"
            className={cn("proceso-paso-nav-numero proceso-paso-nav-numero--actual", PASO_NAV_SLOT_CLASS)}
          >
            {pasoActual + 1}
          </button>

          {indicePasoSiguiente !== null ? (
            <button
              type="button"
              onClick={() => setPasoActual(indicePasoSiguiente)}
              aria-label={`Ir al paso ${indicePasoSiguiente + 1}`}
              className={cn("proceso-paso-nav-numero proceso-paso-nav-numero--adyacente", PASO_NAV_SLOT_CLASS)}
            >
              {indicePasoSiguiente + 1}
            </button>
          ) : (
            <span className={PASO_NUMERO_SLOT_RESERVADO_CLASS} aria-hidden />
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "proceso-paso-nav-flecha",
            PASO_NAV_SLOT_CLASS,
            !puedeIrAdelante && PASO_NAV_ARROW_HIDDEN_CLASS
          )}
          onClick={irAdelante}
          disabled={!puedeIrAdelante}
          aria-label="Paso siguiente"
          aria-hidden={!puedeIrAdelante}
          tabIndex={puedeIrAdelante ? 0 : -1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div
        className="flex h-28 shrink-0 flex-col items-center justify-center gap-1 overflow-y-auto rounded-md border border-border bg-muted/20 px-3 py-2 text-center"
        aria-live="polite"
      >
        <p className="shrink-0 text-sm font-semibold capitalize text-foreground">
          {formatoTituloProcesos(paso.titulo)}
        </p>
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
