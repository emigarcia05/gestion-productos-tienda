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

const PROCESO_BORDE_CLASS = "rounded-md border-2 border-[#0072BB] bg-transparent";

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
        className={cn("flex shrink-0 items-center justify-center gap-3 p-3", PROCESO_BORDE_CLASS)}
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

        <div
          className="flex items-center justify-center gap-2"
          aria-live="polite"
          aria-label={`Paso ${pasoActual + 1} de ${pasos.length}`}
        >
          {indicePasoAnterior !== null ? (
            <span className={cn("proceso-paso-nav-numero", PASO_NAV_SLOT_CLASS)}>
              {indicePasoAnterior + 1}
            </span>
          ) : (
            <span className={PASO_NUMERO_SLOT_RESERVADO_CLASS} aria-hidden />
          )}

          <span
            className={cn("proceso-paso-nav-numero proceso-paso-nav-numero--actual", PASO_NAV_SLOT_CLASS)}
            aria-current="step"
          >
            {pasoActual + 1}
          </span>

          {indicePasoSiguiente !== null ? (
            <span className={cn("proceso-paso-nav-numero", PASO_NAV_SLOT_CLASS)}>
              {indicePasoSiguiente + 1}
            </span>
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
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3",
          PROCESO_BORDE_CLASS
        )}
      >
        <div
          className="flex h-28 shrink-0 flex-col items-center justify-center gap-1 overflow-y-auto px-1 py-2 text-center"
          aria-live="polite"
        >
          <p className="shrink-0 text-sm font-semibold capitalize text-black">
            {formatoTituloProcesos(paso.titulo)}
          </p>
          <p className="text-sm leading-relaxed text-black">{paso.texto}</p>
        </div>

        {paso.img ? (
          <>
            <button
              type="button"
              data-variant="ghost"
              className="proceso-paso-imagen-btn flex min-h-0 w-full min-w-0 flex-1 basis-0 items-center justify-center overflow-hidden bg-transparent p-0 outline-none hover:bg-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0 [&_img]:max-h-[90%] [&_img]:max-w-[90%] [&_img]:border-0 [&_img]:bg-transparent [&_span]:max-h-[90%] [&_span]:max-w-[90%] [&_span]:border-0 [&_span]:bg-transparent"
              onClick={() => setImagenAmpliada(true)}
              aria-label="Ampliar imagen del paso"
            >
              <Image
                src={paso.img}
                alt={paso.texto}
                width={1920}
                height={1080}
                className="h-auto w-auto max-h-[90%] max-w-[90%] cursor-zoom-in bg-transparent object-contain"
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
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Este paso no incluye imagen.</p>
          </div>
        )}
      </div>
    </div>
  );
}
